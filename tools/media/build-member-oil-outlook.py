from __future__ import annotations

import asyncio
import subprocess
from dataclasses import dataclass
from pathlib import Path

import edge_tts
import imageio_ffmpeg
from mutagen.mp3 import MP3
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "tmp" / "member-oil-outlook"
VIDEO = OUT / "MOOX原油九至十一月趋势与地缘风险.mp4"
SUBTITLE_ZH = OUT / "subtitles.vtt"
SUBTITLE_EN = OUT / "subtitles.en.vtt"
POSTER = OUT / "poster.png"
FONT = Path(r"C:\Windows\Fonts\msyh.ttc")
FONT_BOLD = Path(r"C:\Windows\Fonts\msyhbd.ttc")
FFMPEG = Path(imageio_ffmpeg.get_ffmpeg_exe())


@dataclass(frozen=True)
class Slide:
    eyebrow: str
    title: str
    bullets: tuple[str, ...]
    zh: tuple[str, ...]
    en: tuple[str, ...]
    accent: str


SLIDES = (
    Slide(
        "MOOX 会员趋势专题",
        "原油：九至十一月趋势与地缘风险",
        ("六爻主判长期路径", "奇门复核时间与事件窗口", "今后不做原油日内机械预测"),
        (
            "这一期只回答一个问题：原油从九月到十一月，长线节奏怎么看？",
            "我们把核心六爻三个月判断，与丁酉月奇门的时间窗口放在一起交叉核对。",
            "先说结论：九月偏修复，十月七日至十一月七日关注阶段高位，十一月七日后留意逐步回落。",
        ),
        (
            "This episode asks one question: what is crude oil's broader path from September through November?",
            "We combine a three-month Liu Yao thesis with a Ding-You month Qimen timing cross-check.",
            "Bottom line: September favors repair, October 7 to November 7 is the main high-zone watch, and risk shifts lower after November 7.",
        ),
        "#D1A653",
    ),
    Slide(
        "核心六爻主判",
        "三个月不是一条直线",
        ("九月：缓慢修复、逐步抬升", "10月7日—11月7日：高位候选区", "11月7日后：动能减弱、留意回落"),
        (
            "这份三个月六爻材料，把价格主线放在财爻与月令强弱上。",
            "九月更像缓慢修复，不是突然单边拉升。",
            "进入戌月以后，财爻得到帮助，所以十月七日至十一月七日，是三个月内最值得观察的高位候选区。",
            "十一月七日后，财源受到压制，路径更偏向高位之后逐步回落。",
        ),
        (
            "The three-month Liu Yao reading follows the wealth lines and their strength across monthly phases.",
            "September looks more like a gradual repair than an instant one-way surge.",
            "As the Xu month begins, the wealth lines gain support, making October 7 to November 7 the primary candidate high zone.",
            "After November 7, the source of price support weakens, so the path leans toward a gradual fade from elevated levels.",
        ),
        "#7C5CE4",
    ),
    Slide(
        "丁酉月奇门复核",
        "只负责时机，不替代方向",
        ("观察窗：9月21日以后", "风险中心：9月27日前后", "条件：地缘摩擦或运输受阻真实发生"),
        (
            "奇门月盘不负责改写六爻方向，只用来找可能放大波动的时间。",
            "本月盘把九月二十一日以后列为风险升温区，九月二十七日前后是需要重点留意的中心窗口。",
            "盘面关于运输受阻与地缘摩擦的提示，只能当作条件性情景，不能当作已经发生的事实。",
            "只有现实新闻、航运与价格结构同时确认，才说明风险溢价正在进入油价。",
        ),
        (
            "The Qimen month chart does not override the Liu Yao direction; it only identifies timing that may amplify volatility.",
            "It marks the period after September 21 as a rising-risk window, centered around September 27.",
            "Its transport and geopolitical signals are conditional scenarios, not statements that an event has already happened.",
            "Risk premium is confirmed only when real-world news, shipping conditions and price structure agree.",
        ),
        "#D16B55",
    ),
    Slide(
        "组合路径",
        "九月修复 → 十月高位窗 → 十一月转弱",
        ("9月：修复为主，月底波动可能加大", "10/7—11/7：高位候选，不等于每天上涨", "11/7后：高位兑现与回落风险增加"),
        (
            "把两套方法合起来，九月的大方向仍是修复，但月底可能因为事件风险出现更大的上下波动。",
            "十月七日至十一月七日是高位候选区，不代表区间内每一天都上涨，也不等于到了日期就机械卖出。",
            "如果九月底出现运输扰动，油价可能先被风险溢价推高；如果现实条件没有确认，仍按普通震荡修复处理。",
            "十一月七日以后，才把重心从追随修复转向防守高位回落。",
        ),
        (
            "Combining both methods, September still favors repair, but event risk may create larger swings near month-end.",
            "October 7 to November 7 is a candidate high zone, not a promise of daily gains or an automatic sell date.",
            "If transport disruption emerges near late September, risk premium may lift oil; without confirmation, treat it as ordinary range repair.",
            "After November 7, the focus shifts from following the repair to defending against a fade from higher levels.",
        ),
        "#4EA6A1",
    ),
    Slide(
        "地缘政治如何传导",
        "事件不是结论，传导链才是重点",
        ("冲突升级／航线受阻", "运费、保险与供应担忧上升", "风险溢价进入油价", "若供应未受影响，溢价也可能快速回吐"),
        (
            "地缘政治并不是一出现就必然推高原油。真正要看的是传导链。",
            "第一步，是重要产区、港口或航线是否受到实际影响。第二步，是运费、保险和交付周期是否上升。",
            "第三步，才是供应担忧转化为油价风险溢价。",
            "如果冲突没有影响真实供应，或者需求端明显走弱，事件溢价也可能很快回吐，所以不能只看标题追涨。",
        ),
        (
            "Geopolitical tension does not automatically lift crude. The transmission chain matters.",
            "First ask whether production areas, ports or shipping routes are actually affected. Then watch freight, insurance and delivery times.",
            "Only after that can supply fear become an oil-price risk premium.",
            "If supply remains intact or demand weakens sharply, that premium can fade quickly, so headlines alone are not a reason to chase.",
        ),
        "#C46A3B",
    ),
    Slide(
        "确认与失效",
        "让现实市场决定是否执行",
        ("确认：运输／供应扰动 + 价格结构转强", "减分：美元走强、需求转弱、库存压力", "失效：窗口到达但现实与价格均不确认"),
        (
            "长期判断也必须接受现实市场验证。",
            "偏强情景需要运输或供应扰动出现，同时价格结构能够站稳，而不是只有一条消息。",
            "美元明显走强、需求预期下修、库存持续累积，都会削弱上涨路径。",
            "如果关键窗口到达，但现实事件与价格结构都不确认，就把它记为未触发，而不是事后寻找借口。",
        ),
        (
            "Even a long-horizon thesis must be tested against the real market.",
            "The bullish scenario needs an actual transport or supply disruption plus a strengthening price structure, not just one headline.",
            "A stronger dollar, weaker demand expectations or persistent inventory builds reduce the bullish case.",
            "If the window arrives without event or price confirmation, record it as not triggered instead of inventing a hindsight explanation.",
        ),
        "#5579C4",
    ),
    Slide(
        "MOOX 方法调整",
        "原油退出日内与周度机械预测",
        ("不再发布原油每日方向", "不再发布原油机械周预测", "不纳入自动交易", "只保留月度、季度与事件专题"),
        (
            "从这一期开始，MOOX不再做原油日内方向，也不再做机械化的每周预测。",
            "原因很直接：原油短期同时受到地缘政治、库存、欧佩克政策、美元、期限结构与合约换月影响，噪音太多。",
            "它也不会进入自动交易体系。以后只保留月度、季度和重大事件专题，用来研究大趋势与风险窗口。",
            "这不是回避验证，而是把不稳定的方法从错误的时间尺度上移开。",
        ),
        (
            "Starting with this episode, MOOX will stop publishing intraday crude direction and mechanical weekly forecasts.",
            "The reason is simple: short-term oil is simultaneously driven by geopolitics, inventories, OPEC policy, the dollar, term structure and contract rolls.",
            "Crude will also stay outside the automated trading system. We will retain only monthly, quarterly and major-event studies.",
            "This is not avoiding verification; it is removing an unstable method from the wrong time horizon.",
        ),
        "#A45766",
    ),
    Slide(
        "本期结论",
        "看大趋势，等现实确认",
        ("九月：偏修复", "10/7—11/7：阶段高位候选区", "9/21后：地缘与运输风险观察", "11/7后：逐步防守回落"),
        (
            "最后总结。九月原油偏修复，十月七日至十一月七日关注阶段高位候选区。",
            "九月二十一日以后，尤其九月二十七日前后，观察地缘与运输风险是否真的进入市场。",
            "十一月七日以后，逐步提高对高位回落的防守。",
            "所有日期都是观察窗口，不是机械下单日。本视频只用于研究与复盘，不构成收益承诺或投资建议。",
        ),
        (
            "Final summary: crude favors repair in September, with October 7 to November 7 as the candidate high zone.",
            "After September 21, especially around September 27, watch whether geopolitical and transport risks actually enter the market.",
            "After November 7, gradually increase defenses against a fade from higher levels.",
            "These are observation windows, not automatic trading dates. This video is for research and review, not a return promise or investment advice.",
        ),
        "#D1A653",
    ),
)


def wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for char in text:
        candidate = current + char
        if current and draw.textlength(candidate, font=font) > width:
            lines.append(current)
            current = char
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def build_slide(index: int, slide: Slide) -> Path:
    image = Image.new("RGB", (1920, 1080), "#05070B")
    draw = ImageDraw.Draw(image)
    title_font = ImageFont.truetype(str(FONT_BOLD), 66)
    body_font = ImageFont.truetype(str(FONT), 36)
    eyebrow_font = ImageFont.truetype(str(FONT_BOLD), 25)
    small_font = ImageFont.truetype(str(FONT), 23)

    draw.rounded_rectangle((64, 54, 1856, 1025), radius=38, fill="#0D111A", outline="#2B3342", width=2)
    draw.rounded_rectangle((92, 88, 103, 992), radius=6, fill=slide.accent)
    draw.text((136, 94), slide.eyebrow, font=eyebrow_font, fill=slide.accent)
    title_lines = wrap(draw, slide.title, title_font, 1560)
    y = 152
    for line in title_lines:
        draw.text((136, y), line, font=title_font, fill="#F7F7FA")
        y += 82
    y += 48

    for bullet in slide.bullets:
        draw.rounded_rectangle((144, y + 12, 160, y + 28), radius=8, fill=slide.accent)
        lines = wrap(draw, bullet, body_font, 1510)
        for line in lines:
            draw.text((190, y), line, font=body_font, fill="#D7DBE4")
            y += 56
        y += 35

    if index == 4:
        x0, y0, width = 170, 800, 1490
        draw.line((x0, y0, x0 + width, y0), fill="#596171", width=5)
        for ratio, label, color in ((0.05, "9月修复", "#4EA6A1"), (0.48, "10/7", "#D1A653"), (0.78, "11/7", "#D16B55")):
            x = x0 + int(width * ratio)
            draw.ellipse((x - 12, y0 - 12, x + 12, y0 + 12), fill=color)
            draw.text((x - 42, y0 + 28), label, font=small_font, fill=color)

    draw.text((136, 960), "MOOX Intelligence · 长周期研究 · 非机械交易信号", font=small_font, fill="#767D8C")
    draw.text((1740, 960), f"{index}/{len(SLIDES)}", font=small_font, fill="#767D8C")
    path = OUT / f"slide-{index:02d}.png"
    image.save(path, quality=95)
    return path


async def speak(text: str, path: Path) -> None:
    await edge_tts.Communicate(text, "zh-CN-YunxiNeural", rate="-5%", pitch="-2Hz").save(str(path))


async def build_audio(paths: list[Path]) -> None:
    await asyncio.gather(*(speak("".join(slide.zh), path) for slide, path in zip(SLIDES, paths)))


def stamp(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def write_vtt(path: Path, language: str, durations: list[float]) -> None:
    rows = ["WEBVTT", "", f"NOTE MOOX member video subtitles ({language})", ""]
    cursor = 0.0
    for slide, duration in zip(SLIDES, durations):
        cues = slide.zh if language == "zh-CN" else slide.en
        usable = max(duration - 0.5, 1.0)
        weights = [max(len(cue), 1) for cue in cues]
        total = sum(weights)
        local = cursor + 0.15
        end_limit = cursor + usable
        for cue, weight in zip(cues, weights):
            cue_duration = usable * weight / total
            end = min(end_limit, local + cue_duration)
            rows.extend((f"{stamp(local)} --> {stamp(end)}", cue, ""))
            local = end
        cursor += duration
    path.write_text("\n".join(rows), encoding="utf-8")


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def build() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    slides = [build_slide(index, slide) for index, slide in enumerate(SLIDES, 1)]
    Image.open(slides[0]).save(POSTER)
    audio = [OUT / f"audio-{index:02d}.mp3" for index in range(1, len(SLIDES) + 1)]
    asyncio.run(build_audio(audio))

    durations: list[float] = []
    segments: list[Path] = []
    for index, (slide, audio_path) in enumerate(zip(slides, audio), 1):
        duration = MP3(audio_path).info.length + 0.65
        durations.append(duration)
        segment = OUT / f"segment-{index:02d}.mp4"
        run([
            str(FFMPEG), "-y", "-loop", "1", "-i", str(slide), "-i", str(audio_path),
            "-t", f"{duration:.3f}", "-vf", "scale=1280:720", "-c:v", "libx264",
            "-preset", "medium", "-tune", "stillimage", "-crf", "29", "-r", "12",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-ac", "1",
            "-ar", "32000", "-movflags", "+faststart", str(segment),
        ])
        segments.append(segment)

    concat = OUT / "concat.txt"
    concat.write_text("\n".join(f"file '{segment.as_posix()}'" for segment in segments), encoding="utf-8")
    run([
        str(FFMPEG), "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
        "-c:v", "copy", "-c:a", "aac", "-b:a", "80k", "-ac", "1", "-ar", "48000",
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-movflags", "+faststart", str(VIDEO),
    ])
    write_vtt(SUBTITLE_ZH, "zh-CN", durations)
    write_vtt(SUBTITLE_EN, "en", durations)
    print(VIDEO)
    print(SUBTITLE_ZH)
    print(SUBTITLE_EN)
    print(f"duration={sum(durations):.3f}s")


if __name__ == "__main__":
    build()
