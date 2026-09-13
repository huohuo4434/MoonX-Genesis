import json
import math
import unittest
from datetime import datetime, timedelta, timezone
from analyze import replay, validate_input


def sample(count=120):
    # Synthetic ONLY for algorithm tests; never published as real market history.
    rows = []
    for i in range(count):
        dt = datetime(2025, 1, 1, tzinfo=timezone.utc) + timedelta(days=i)
        price = 100 + 10 * math.sin(i / 4)
        rows.append(dict(date=dt.date().isoformat(), timestamp=dt.timestamp() * 1000,
                         open=price, close=price, high=price+2, low=price-2, volume=None))
    return dict(schema="moox-czsc-input-v1", symbol="SYNTHETIC_TEST", timeframe="1D", closedOnly=True,
                asOf=rows[-1]["date"], barsJson=json.dumps(rows))


class ReplayTest(unittest.TestCase):
    def test_native_roundtrip_and_no_authority(self):
        report = replay(sample())
        self.assertEqual(report["engine"], "czsc-1.0.1")
        self.assertGreater(len(report["strokes"]), 3)
        self.assertGreater(len(report["zones"]), 0)
        self.assertEqual(report["authority"], "RESEARCH_ONLY")
        self.assertFalse(report["tradingEligible"])
        self.assertFalse(report["replay"]["profitBacktested"])
        for s in report["strokes"]:
            self.assertLess(s["start"], s["end"])
            self.assertLessEqual(s["end"], s["observedOn"])
        self.assertEqual(report, replay(sample()))

    def test_future_bars_never_change_past_journal(self):
        short = replay(sample(75))
        full = replay(sample(120))
        self.assertEqual(short["journal"], [r for r in full["journal"] if r["observedOn"] <= short["asOf"]])

    def test_bad_inputs(self):
        for field, value in [("timeframe", "1H"), ("closedOnly", False), ("asOf", "2099-01-01")]:
            payload = sample(); payload[field] = value
            with self.assertRaises(ValueError):
                validate_input(payload)
        for mutate in [lambda b: b.update(close=float("inf")), lambda b: b.update(volume=-1),
                       lambda b: b.update(high=1), lambda b: b.update(timestamp=True),
                       lambda b: b.update(date="2025-01-01")]:
            payload = sample(); rows = json.loads(payload["barsJson"]); mutate(rows[5]); payload["barsJson"] = json.dumps(rows)
            with self.assertRaises(ValueError):
                validate_input(payload)


if __name__ == "__main__":
    unittest.main()
