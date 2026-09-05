"""Original bilingual member video. No source screenshots or private posts are rendered.

Reuses the existing member-oil pipeline's PIL / edge-tts / FFmpeg dependencies.
Primary subtitles use TTS word timestamps; translations follow each spoken paragraph.
No upload credentials or production mutation in this builder.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import re
import subprocess
from pathlib import Path

import edge_tts
import imageio_ffmpeg
from mutagen.mp3 import MP3
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).with_name("musk-outlook-20260905.json")
OUT = ROOT / "tmp" / "musk-outlook-20260905"
DATA = json.loads(SOURCE.read_text(encoding="utf-8"))
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FONT = r"C:\Windows\Fonts\msyh.ttc"
BOLD = r"C:\Windows\Fonts\msyhbd.ttc"


def wrap(draw, value, font, width):
    # English breaks at words, Chinese at characters.
    parts = value.split(" ") if " " in value and not re.search(r"[\u4e00-\u9fff]", value) else list(value)
    separator = " " if parts == value.split(" ") else ""
    lines, current = [], ""
    for part in parts:
        trial = current + (separator if current else "") + part
        if current and draw.textlength(trial, font=font) > width:
            lines.append(current)
            current = part
        else:
            current = trial
    return lines + ([current] if current else [])


def slide_image(index, slide, lang):
    language = 0 if lang == "zh" else 1
    canvas = Image.new("RGB", (1280, 720), "#070d17")
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle((30, 30, 1250, 636), radius=26, fill="#101c2d", outline="#2b3f56", width=2)
    d.rectangle((65, 75, 73, 577), fill="#e6bc77")
    f = lambda size, bold=False: ImageFont.truetype(BOLD if bold else FONT, size)
    d.text((100, 66), "MOOX  /  SEPTEMBER 2026  /  RESEARCH", font=f(18, True), fill="#e6bc77")
    y = 111
    for line in wrap(d, slide["title"][language], f(37, True), 1080):
        d.text((100, y), line, font=f(37, True), fill="#f5f7fb")
        y += 49
    y += 30
    width = 745 if slide.get("chart") else 1020
    for point in slide["points"][language]:
        d.ellipse((105, y + 12, 114, y + 21), fill="#69c6bf")
        for line in wrap(d, point, f(25), width):
            d.text((135, y), line, font=f(25), fill="#d7e2ee")
            y += 36
        y += 25
    assert y < 555, (index, lang, y)
    if slide.get("chart"):
        chart = slide["chart"]
        for column, changed in enumerate([False, True] if chart["moving"] else [False]):
            x = 965 + column * 126
            d.text((x, 234), "BASE" if not changed else "CHANGE", font=f(13), fill="#91a9c4")
            for n in range(6, 0, -1):
                bit = chart["base"][n - 1] ^ (changed and n in chart["moving"])
                yy = 275 + (6 - n) * 39
                color = "#e6bc77" if n in chart["moving"] else "#b6c9e0"
                if bit:
                    d.rectangle((x, yy, x + 95, yy + 13), fill=color)
                else:
                    d.rectangle((x, yy, x + 39, yy + 13), fill=color)
                    d.rectangle((x + 56, yy, x + 95, yy + 13), fill=color)
        d.text((960, 535), "Lines counted bottom up", font=f(13), fill="#91a9c4")
    for j, line in enumerate(wrap(d, slide["source"], f(15), 1035)):
        d.text((100, 568 + j * 21), line, font=f(15), fill="#9aabc0")
    d.text((1130, 606), f"{index + 1:02d} / 12", font=f(14), fill="#91a9c4")
    path = OUT / lang / f"slide-{index + 1:02d}.png"
    canvas.save(path)
    return path


async def voice(text, path, lang, semaphore):
    cache = path.with_suffix(".json")
    digest = hashlib.sha256((lang + text).encode()).hexdigest()
    if path.exists() and cache.exists() and json.loads(cache.read_text())["hash"] == digest:
        return
    async with semaphore:
        for attempt in range(3):
            try:
                chunks, bounds = [], []
                talk = edge_tts.Communicate(text, "zh-CN-YunxiNeural" if lang == "zh" else "en-US-GuyNeural", rate="-3%", boundary="WordBoundary")
                async for event in talk.stream():
                    if event["type"] == "audio":
                        chunks.append(event["data"])
                    elif event["type"] == "WordBoundary":
                        bounds.append({k: event[k] for k in ("offset", "duration", "text")})
                path.write_bytes(b"".join(chunks))
                assert MP3(path).info.length > 0 and bounds
                cache.write_text(json.dumps({"hash": digest, "words": bounds}), encoding="utf-8")
                return
            except Exception:
                if attempt == 2:
                    raise
                await asyncio.sleep(1 + attempt)


def run(args):
    subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def stamp(seconds):
    millis = round(seconds * 1000)
    h, remain = divmod(millis, 3600000)
    m, remain = divmod(remain, 60000)
    s, ms = divmod(remain, 1000)
    return f"{h:02}:{m:02}:{s:02}.{ms:03}"


def subtitle_groups(text, lang):
    limit = 35 if lang == "zh" else 78
    tokens = list(text) if lang == "zh" else text.split()
    joiner = "" if lang == "zh" else " "
    groups, group = [], ""
    for token in tokens:
        value = group + (joiner if group else "") + token
        if group and len(value) > limit:
            groups.append(group)
            group = token
        else:
            group = value
    return groups + ([group] if group else [])


async def build():
    sem = asyncio.Semaphore(4)
    jobs = []
    for lang in ("zh", "en"):
        (OUT / lang).mkdir(parents=True, exist_ok=True)
        for i, slide in enumerate(DATA["slides"]):
            for j, text in enumerate(slide[lang]):
                jobs.append(voice(text, OUT / lang / f"voice-{i:02}-{j:02}.mp3", lang, sem))
    await asyncio.gather(*jobs)
    print("VOICE_GENERATION_PASSED", flush=True)
    report = {"cutoff": DATA["cutoff"], "versions": {}}
    for lang in ("zh", "en"):
        folder, elapsed, segments = OUT / lang, 0.0, []
        cues = {"zh": [], "en": []}
        for i, slide in enumerate(DATA["slides"]):
            frame = slide_image(i, slide, lang)
            paths = [folder / f"voice-{i:02}-{j:02}.mp3" for j in range(len(slide[lang]))]
            lengths = [MP3(path).info.length for path in paths]
            playlist = folder / "audio-concat.txt"
            playlist.write_text("\n".join(f"file '{p.as_posix()}'" for p in paths))
            wave = folder / f"audio-{i:02}.wav"
            run(["-f", "concat", "-safe", "0", "-i", str(playlist), "-ar", "24000", "-ac", "1", str(wave)])
            duration = sum(lengths)
            segment = folder / f"segment-{i:02}.mp4"
            run(["-loop", "1", "-framerate", "10", "-i", str(frame), "-i", str(wave), "-t", f"{duration:.6f}", "-c:v", "libx264", "-preset", "fast", "-tune", "stillimage", "-crf", "28", "-r", "10", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", str(segment)])
            # Use actual encoded duration for the next slide's subtitle offset.
            import wave as wav
            with wav.open(str(wave)) as reader:
                audio_duration = reader.getnframes() / reader.getframerate()
            cursor = elapsed
            for j, (path, length) in enumerate(zip(paths, lengths)):
                words = json.loads(path.with_suffix(".json").read_text())["words"]
                group, start, end = "", 0.0, 0.0
                for word in words:
                    token = word["text"]
                    separator = "" if lang == "zh" else " "
                    if group and len(group) + len(token) + 1 > (35 if lang == "zh" else 78):
                        cues[lang].append((cursor + start, cursor + end, group))
                        group = ""
                    if not group:
                        start = word["offset"] / 10000000
                    group += (separator if group else "") + token
                    end = min(length, (word["offset"] + word["duration"]) / 10000000)
                if group:
                    cues[lang].append((cursor + start, cursor + end, group))
                other = "en" if lang == "zh" else "zh"
                groups = subtitle_groups(slide[other][j], other)
                total = sum(len(g) for g in groups)
                local = cursor
                for group in groups:
                    end = local + length * len(group) / total
                    cues[other].append((local, end, group))
                    local = end
                cursor += length
            # At 10fps the video duration is rounded up to a frame boundary.
            import math
            elapsed += math.ceil(audio_duration * 10) / 10
            segments.append(segment)
            print(f"RENDERED {lang} {i + 1}/12", flush=True)
        playlist = folder / "video-concat.txt"
        playlist.write_text("\n".join(f"file '{p.as_posix()}'" for p in segments))
        video = folder / "video.mp4"
        run(["-f", "concat", "-safe", "0", "-i", str(playlist), "-c:v", "copy", "-c:a", "aac", "-b:a", "72k", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-movflags", "+faststart", str(video)])
        assert 1024 * 1024 < video.stat().st_size <= 32 * 1024 * 1024
        for subtitle_lang, rows in cues.items():
            lines = ["WEBVTT", ""]
            previous = -1.0
            for start, end, text in rows:
                start, end = round(start, 3), round(end, 3)
                assert end > start >= previous and end <= elapsed + 1, (start, end, previous)
                previous = end
                lines.extend([f"{stamp(start)} --> {stamp(end)}", text, ""])
            (folder / ("subtitles.vtt" if subtitle_lang == "zh" else "subtitles.en.vtt")).write_text("\n".join(lines), encoding="utf-8")
        report["versions"][lang] = {"duration": elapsed, "bytes": video.stat().st_size, "sha256": hashlib.sha256(video.read_bytes()).hexdigest(), "cues": {key: len(value) for key, value in cues.items()}}
    (OUT / "render-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report), flush=True)


if __name__ == "__main__":
    asyncio.run(build())
