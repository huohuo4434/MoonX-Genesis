"""Offline CZSC closed-daily-bar replay. Reads JSON, writes JSON; never sends orders."""
import argparse
import hashlib
import json
import math
from datetime import date, datetime, timezone
from importlib.metadata import version
from pathlib import Path


def validate_input(payload):
    if payload.get("schema") != "moox-czsc-input-v1" or payload.get("timeframe") != "1D" or payload.get("closedOnly") is not True:
        raise ValueError("Expected closed daily MOOX chart export")
    if not isinstance(payload.get("symbol"), str) or not 1 <= len(payload["symbol"]) <= 100:
        raise ValueError("Missing symbol")
    raw = payload.get("barsJson")
    if not isinstance(raw, str) or len(raw) > 2_000_000:
        raise ValueError("Invalid input size")
    rows = json.loads(raw)
    if not isinstance(rows, list) or not 20 <= len(rows) <= 2000:
        raise ValueError("Expected 20..2000 closed bars")
    previous_date, previous_timestamp = "", -1
    for b in rows:
        day = date.fromisoformat(b["date"])
        if day.isoformat() != b["date"] or b["date"] <= previous_date:
            raise ValueError("Dates must be ISO, unique and ascending")
        values = [b.get(k) for k in ("timestamp", "open", "high", "low", "close")]
        if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in values):
            raise ValueError("Non-finite OHLC / timestamp")
        if b["timestamp"] <= previous_timestamp or b["timestamp"] > datetime.now(timezone.utc).timestamp() * 1000:
            raise ValueError("Duplicate, unordered or future timestamp")
        if b["low"] <= 0 or b["low"] > min(b["open"], b["close"]) or b["high"] < max(b["open"], b["close"]):
            raise ValueError("Invalid OHLC geometry")
        volume = b.get("volume")
        if volume is not None and (isinstance(volume, bool) or not isinstance(volume, (int, float)) or not math.isfinite(volume) or volume < 0):
            raise ValueError("Invalid volume")
        previous_date, previous_timestamp = b["date"], b["timestamp"]
    if payload.get("asOf") != rows[-1]["date"]:
        raise ValueError("asOf must equal final closed date")
    return rows


def replay(payload):
    rows = validate_input(payload)
    if version("czsc") != "1.0.1":
        raise RuntimeError("Pinned czsc==1.0.1 required")
    from czsc import CZSC, RawBar, Freq, get_zs_seq

    engine, current, first_seen, journal = None, {}, {}, []
    for i, row in enumerate(rows):
        # Provider session date stays intact; no local-machine timezone conversion.
        bar = RawBar(symbol=payload["symbol"], dt=datetime.fromisoformat(row["date"]), freq=Freq.D,
                     open=row["open"], close=row["close"], high=row["high"], low=row["low"],
                     vol=row.get("volume") or 0, amount=0, id=i)
        if engine is None:
            engine = CZSC([bar], min_bi_len=6, max_bi_num=2000)
        else:
            engine.update(bar)
        # Exclude unfinished latest stroke; even finished_bis can be revised later.
        structures = []
        for bi in engine.finished_bis:
            structures.append(("STROKE", {
                "start": bi.fx_a.dt.date().isoformat(), "end": bi.fx_b.dt.date().isoformat(),
                "startPrice": bi.fx_a.fx, "endPrice": bi.fx_b.fx,
                "direction": "UP" if bi.fx_b.fx > bi.fx_a.fx else "DOWN",
            }))
        for zone in get_zs_seq(engine.finished_bis):
            if zone.is_valid and zone.zd < zone.zg:
                structures.append(("ZONE", {"start": zone.sdt.date().isoformat(), "end": zone.edt.date().isoformat(),
                                            "low": zone.zd, "high": zone.zg}))
        latest = {kind + json.dumps(s, sort_keys=True): (kind, s) for kind, s in structures}
        for key in current.keys() - latest.keys():
            kind, value = current[key]
            journal.append({"event": "RETRACTED", "kind": kind, "observedOn": row["date"], "structure": value})
        for key in latest.keys() - current.keys():
            kind, value = latest[key]
            # Re-appearance is a fresh observation, not retroactively backdated.
            first_seen[key] = row["date"]
            journal.append({"event": "OBSERVED", "kind": kind, "observedOn": row["date"], "structure": value})
        current = latest
    # Stable sort makes independent runs reproducible (sets above are unordered).
    journal.sort(key=lambda r: (r["observedOn"], r["event"], r["kind"], json.dumps(r["structure"], sort_keys=True)))
    output = {"schema": "moox-czsc-v1", "engine": "czsc-1.0.1", "authority": "RESEARCH_ONLY", "tradingEligible": False,
              "symbol": payload["symbol"], "timeframe": "1D", "asOf": payload["asOf"], "minBiLen": 6,
              "inputHash": hashlib.sha256(payload["barsJson"].encode("utf-8")).hexdigest(),
              "strokes": [], "zones": [], "journal": journal,
              "replay": {"bars": len(rows), "additions": sum(r["event"] == "OBSERVED" for r in journal),
                         "revisions": sum(r["event"] == "RETRACTED" for r in journal), "profitBacktested": False}}
    for key, (kind, value) in current.items():
        output["strokes" if kind == "STROKE" else "zones"].append({**value, "observedOn": first_seen[key]})
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if args.input.stat().st_size > 2_000_000:
        parser.error("Input exceeds 2 MB")
    result = replay(json.loads(args.input.read_text(encoding="utf-8-sig")))
    # Exclusive creation: preserve earlier research artifacts and the source export.
    with args.output.open("x", encoding="utf-8") as target:
        json.dump(result, target, ensure_ascii=False, allow_nan=False, indent=2)
    print(f"CZSC RESEARCH PASSED: {result['symbol']} {result['asOf']}; {len(result['strokes'])} strokes; no execution authority")
