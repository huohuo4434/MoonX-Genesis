from __future__ import annotations

import base64
import ctypes
import json
import os
import random
import subprocess
import sys
import time
import urllib.error
import urllib.request
from ctypes import wintypes
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Iterable

COLLECTOR_VERSION = "7.1.0"
APP_DIR = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "MOOX-X-Collector"
CONFIG_PATH = APP_DIR / "config.json"
CREDENTIALS_PATH = APP_DIR / "credentials.dpapi"
STATE_PATH = APP_DIR / "state.json"
STATUS_PATH = APP_DIR / "last-status.json"
LOG_PATH = APP_DIR / "collector.log"


class DATA_BLOB(ctypes.Structure):
    _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_byte))]


def _blob(data: bytes) -> tuple[DATA_BLOB, Any]:
    buffer = ctypes.create_string_buffer(data)
    return DATA_BLOB(len(data), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_byte))), buffer


def dpapi_unprotect(encoded: str) -> bytes:
    raw = base64.b64decode(encoded)
    in_blob, in_buffer = _blob(raw)
    out_blob = DATA_BLOB()
    result = ctypes.windll.crypt32.CryptUnprotectData(
        ctypes.byref(in_blob), None, None, None, None, 0, ctypes.byref(out_blob)
    )
    _ = in_buffer
    if not result:
        raise ctypes.WinError()
    try:
        return ctypes.string_at(out_blob.pbData, out_blob.cbData)
    finally:
        ctypes.windll.kernel32.LocalFree(out_blob.pbData)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def log(message: str) -> None:
    APP_DIR.mkdir(parents=True, exist_ok=True)
    line = f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {message}"
    print(line)
    with LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(line + "\n")


def load_json(path: Path, fallback: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return fallback


def load_credentials() -> dict[str, str]:
    if not CREDENTIALS_PATH.exists():
        raise RuntimeError("未配置X Cookie和采集密钥，请先运行 CONFIGURE_MOOX_X_COLLECTOR.cmd")
    encrypted = CREDENTIALS_PATH.read_text(encoding="utf-8").strip()
    payload = json.loads(dpapi_unprotect(encrypted).decode("utf-8"))
    required = ("auth_token", "ct0", "ingest_secret")
    missing = [name for name in required if not str(payload.get(name, "")).strip()]
    if missing:
        raise RuntimeError("本地加密凭据不完整：" + ", ".join(missing))
    return {key: str(value) for key, value in payload.items()}


def find_twitter_executable() -> str:
    candidates = [
        Path(sys.executable).parent / "twitter.exe",
        APP_DIR / "venv" / "Scripts" / "twitter.exe",
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return "twitter"


def parse_datetime(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return utc_now()
    for candidate in (text, text.replace("Z", "+00:00")):
        try:
            parsed = datetime.fromisoformat(candidate)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        except ValueError:
            pass
    try:
        parsed = datetime.strptime(text, "%a %b %d %H:%M:%S %z %Y")
        return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except ValueError:
        return utc_now()


def first_value(row: dict[str, Any], keys: Iterable[str]) -> Any:
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            return value
    legacy = row.get("legacy")
    if isinstance(legacy, dict):
        for key in keys:
            value = legacy.get(key)
            if value not in (None, ""):
                return value
    return None


def walk(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def extract_posts(payload: Any, username: str) -> list[dict[str, str]]:
    posts: dict[str, dict[str, str]] = {}
    for row in walk(payload):
        post_id = first_value(row, ("id", "id_str", "tweet_id", "rest_id"))
        text = first_value(row, ("full_text", "text", "content", "note_tweet_text"))
        if not post_id or not text or not isinstance(text, str):
            continue
        normalized_id = str(post_id).strip()
        normalized_text = text.strip()
        if not normalized_id.isdigit() or len(normalized_text) < 2:
            continue
        created_at = parse_datetime(first_value(row, ("created_at", "createdAt", "timestamp", "date")))
        posts[normalized_id] = {
            "username": username,
            "id": normalized_id,
            "text": normalized_text,
            "createdAt": created_at,
            "url": f"https://x.com/{username}/status/{normalized_id}",
        }
    return sorted(posts.values(), key=lambda item: item["createdAt"], reverse=True)


def fetch_user_posts(username: str, limit: int, credentials: dict[str, str], timeout: int) -> list[dict[str, str]]:
    executable = find_twitter_executable()
    command = [
        executable,
        "user-posts",
        username,
        "--max",
        str(limit),
        "--json",
        "--full-text",
    ]
    environment = os.environ.copy()
    environment["TWITTER_AUTH_TOKEN"] = credentials["auth_token"]
    environment["TWITTER_CT0"] = credentials["ct0"]
    proxy = credentials.get("proxy", "").strip()
    if proxy:
        environment["TWITTER_PROXY"] = proxy
        environment["HTTP_PROXY"] = proxy
        environment["HTTPS_PROXY"] = proxy
    completed = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=environment,
        timeout=timeout,
    )
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "twitter-cli failed").strip()
        raise RuntimeError(detail[-1200:])
    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"twitter-cli未返回合法JSON：{error}") from error
    return extract_posts(payload, username)


def within_lookback(post: dict[str, str], hours: int) -> bool:
    try:
        parsed = datetime.fromisoformat(post["createdAt"].replace("Z", "+00:00"))
    except ValueError:
        return True
    return parsed >= datetime.now(timezone.utc) - timedelta(hours=hours)


def post_to_moox(site_url: str, secret: str, posts: list[dict[str, str]], timeout: int) -> dict[str, Any]:
    endpoint = site_url.rstrip("/") + "/api/internal/x-intelligence/ingest"
    body = json.dumps(
        {
            "collector": {
                "id": f"moox-windows-x-collector/{COLLECTOR_VERSION}",
                "checkedAt": utc_now(),
            },
            "posts": posts,
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {secret}",
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": f"MOOX-X-Collector/{COLLECTOR_VERSION}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"MOOX接收接口HTTP {error.code}: {detail[:800]}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"无法连接MOOX接收接口：{error.reason}") from error


def main() -> int:
    APP_DIR.mkdir(parents=True, exist_ok=True)
    config = load_json(CONFIG_PATH, {})
    credentials = load_credentials()
    accounts = [str(value).replace("@", "").strip() for value in config.get("accounts", [])]
    accounts = [value for value in accounts if value]
    if not accounts:
        raise RuntimeError("config.json没有配置观察账号")

    site_url = str(config.get("site_url", "https://mooxintel.com")).strip()
    max_posts = max(1, min(50, int(config.get("max_posts_per_account", 15))))
    lookback_hours = max(1, min(24 * 30, int(config.get("lookback_hours", 168))))
    timeout = max(15, min(120, int(config.get("timeout_seconds", 60))))
    state = load_json(STATE_PATH, {"sent_ids": []})
    sent_ids = set(str(value) for value in state.get("sent_ids", []))

    errors: list[str] = []
    collected: list[dict[str, str]] = []
    for index, username in enumerate(accounts):
        try:
            rows = fetch_user_posts(username, max_posts, credentials, timeout)
            fresh = [row for row in rows if within_lookback(row, lookback_hours)]
            collected.extend(row for row in fresh if f"{username.lower()}:{row['id']}" not in sent_ids)
            log(f"{username}: 读取{len(rows)}条，时间范围内{len(fresh)}条")
        except Exception as error:  # noqa: BLE001
            message = f"{username}: {error}"
            errors.append(message)
            log("ERROR " + message)
        if index + 1 < len(accounts):
            time.sleep(random.uniform(2.0, 5.0))

    unique = {
        f"{row['username'].lower()}:{row['id']}": row
        for row in collected
    }
    pending = list(unique.values())[:120]
    response: dict[str, Any] = {"ok": True, "report": {"storedPosts": 0}}
    if pending:
        response = post_to_moox(site_url, credentials["ingest_secret"], pending, timeout)
        report = response.get("report", {}) if isinstance(response, dict) else {}
        stored = int(report.get("storedPosts", 0)) if isinstance(report, dict) else 0
        log(f"已向MOOX提交{len(pending)}条，服务端写入{stored}条")
        if not response.get("ok", False):
            raise RuntimeError("MOOX接收接口返回失败：" + json.dumps(response, ensure_ascii=False)[:800])
        sent_ids.update(f"{row['username'].lower()}:{row['id']}" for row in pending)
    else:
        log("本轮没有新帖子需要提交")

    trimmed_ids = list(sent_ids)[-5000:]
    STATE_PATH.write_text(
        json.dumps({"sent_ids": trimmed_ids, "updated_at": utc_now()}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    status = {
        "ok": not errors,
        "version": COLLECTOR_VERSION,
        "checked_at": utc_now(),
        "accounts": accounts,
        "new_posts": len(pending),
        "errors": errors,
        "server_response": response,
    }
    STATUS_PATH.write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if not errors else 2


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        log("FATAL " + str(exc))
        STATUS_PATH.write_text(
            json.dumps({"ok": False, "checked_at": utc_now(), "error": str(exc)}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        raise SystemExit(1)
