from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path

import edge_tts
import imageio_ffmpeg
from mutagen.mp3 import MP3
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[2]
TMP = ROOT / "tmp" / "member-bitget-tutorial"
PDF = ROOT / "private-assets" / "member-trading" / "MOOX会员AI交易接入教程.pdf"
VIDEO_DIR = ROOT / "private-assets" / "member-trading"
VIDEO = VIDEO_DIR / "MOOX会员Bitget接入教程.mp4"
POSTER = VIDEO_DIR / "moox-bitget-tutorial-cover.png"
FONT = Path(r"C:\Windows\Fonts\msyh.ttc")
FONT_BOLD = Path(r"C:\Windows\Fonts\msyhbd.ttc")
FFMPEG = Path(imageio_ffmpeg.get_ffmpeg_exe())

METHODS = [
    ("1", "六爻", "六爻正式方向齐全才候选"),
    ("2", "奇门", "奇门与正式方向同向才候选"),
    ("3", "六爻 + 奇门共振", "两种证据同时齐全且同向"),
    ("4", "六爻 + 缠论", "六爻定方向，缠论找结构位置"),
    ("5", "奇门 + 缠论", "奇门定时机，缠论确认位置"),
    ("6", "六爻 + 奇门 + 缠论", "三层证据齐全且同向，信号最少"),
]

SLIDES = [
    ("会员 AI 交易安全接入", ["Bitget UTA + MOOX 本地 Agent", "API 密钥只留在您自己的电脑", "试运行阶段：先 PAPER，再 DRY_RUN，最后才考虑小仓 LIVE"],
     "本教程带你一步一步完成会员 AI 交易接入。先说最重要的安全原则：Bitget 的 API Key、Secret Key 和 Passphrase，只能保存在你自己的电脑或 VPS，绝不能粘贴到 MOOX 网页，也不要发送给客服。MOOX 网站只给你一枚可以撤销的只读计划 Token。当前系统仍处于试运行阶段，请先用 PAPER 观察，再用 DRY RUN 检查账户，最后才考虑极小仓位实盘。"),
    ("准备工作", ["1. 安装 Node.js 20 或更高版本", "2. 在会员页下载 Windows 一键包并完整解压", "3. 电脑时间开启自动同步", "4. 建议准备固定公网 IPv4；没有就不要进入 LIVE"],
     "第一步是准备环境。安装 Node.js 二十或更高版本，安装时保持默认选项。登录 MOOX 会员区，进入 AI 交易安全接入页面，下载 Windows 一键包，然后完整解压，不要直接在压缩包里运行。电脑系统时间必须开启自动同步，因为交易所签名依赖准确时间。如果以后准备实盘，还要让运行 Agent 的电脑或者 VPS 拥有固定公网 IPv4。没有固定 IP，就停留在 PAPER 或 DRY RUN。"),
    ("先创建 MOOX 只读 Token", ["会员页点击“创建 90 天 Token”", "Token 只显示一次，立即复制", "粘贴到：MOOX_SIGNAL_TOKEN= 后面", "丢失可撤销并重新创建；它不是 Bitget 密钥"],
     "第二步，创建 MOOX 只读计划 Token。在会员接入页面点击创建九十天 Token。它只显示一次，所以立即复制。打开解压目录里的 MOOX 配置文本，把它粘贴到 MOOX SIGNAL TOKEN 等号右边。注意，这枚 Token 只能读取你的会员交易计划，不能提币，也不能代替 Bitget 密钥。丢失后不要寻找旧值，直接在网页撤销，再创建新 Token。"),
    ("先跑 PAPER", ["双击：1-启动PAPER.bat", "PAPER 不连接 Bitget，不产生真实订单", "确认能读取：品种、方向、入场区、止损、止盈、所选方法", "没有正式锁定预测或证据不足时，系统必须显示等待"],
     "第三步必须先运行 PAPER。双击一号启动 PAPER。这个模式不连接 Bitget，也不会产生真实订单。你需要确认窗口能读取品种、锁定方向、入场区、止损、止盈，以及你选择的方法。如果没有当前有效的正式预测，点位顺序不正确，所选方法证据不齐，或者缠论结构冲突，系统都应该明确显示等待，而不是凑一个订单。这种等待是安全机制，不是故障。"),
    ("在 Bitget 创建 UTA API", ["Bitget 个人中心 → API 管理 → 创建 API", "设置独立 Passphrase 并离线保存", "只开启 UTA 管理/读取 + UTA 交易", "禁止：提币、划转、资金转出、跟单相关权限", "准备 LIVE 时绑定运行 Agent 的固定 IPv4"],
     "第四步，在 Bitget 个人中心进入 API 管理并创建 API。创建时设置一个独立的 Passphrase，并和 Key、Secret 一起离线保存。权限只开启统一交易账户的管理读取权限，以及统一交易账户的交易权限。任何提币、划转、资金转出或者不需要的跟单权限都不要开启。准备实盘时，必须把 API 绑定到实际运行 Agent 的固定公网 IPv4。权限名称可能随着 Bitget 页面语言略有变化，如果出现疑问，就对照页面里的 UTA 管理和 UTA 交易，不要勾选提现。"),
    ("三项 Bitget 凭证粘贴位置", ["API Key → BITGET_API_KEY=", "Secret Key → BITGET_API_SECRET=", "API Passphrase → BITGET_API_PASSPHRASE=", "只粘贴等号右边，不加引号，不留多余空格", "示例：bg_**** / **** / 自设口令（视频不展示真实值）"],
     "第五步，回到本机的 MOOX 配置文本。把 API Key 粘贴到 BITGET API KEY 等号后面；把 Secret Key 粘贴到 BITGET API SECRET 后面；把创建 API 时自己设置的 Passphrase 粘贴到 BITGET API PASSPHRASE 后面。只填写等号右边，不要加引号，也不要把三项内容写到网页。视频中的星号只是打码示例。保存文件后，任何人向你索要这三项，都不要发送。"),
    ("选择六种试运行方法", [f"{n}. {name} - {desc}" for n, name, desc in METHODS],
     "第六步选择试运行方法。方法一是六爻；方法二是奇门；方法三是六爻和奇门共振；方法四是六爻加缠论；方法五是奇门加缠论；方法六是六爻、奇门和缠论三层共振。你可以在会员页面点选，也要把对应的 MOOX METHOD 代码写进本机配置。选择不会改变已经锁定的官方方向，只会增加这一单必须满足的证据门槛。证据不足就等待，任何方法都不能绕过止损和仓位控制。"),
    ("DRY_RUN 检查", ["双击：2-检查DRY_RUN.bat", "只验证，不下单", "检查权限、IP 白名单、UTA 账户设置、精确合约、时间同步", "必须拒绝提现权限、过期计划、错误点位和缺失保护单"],
     "第七步双击二号检查 DRY RUN。它会连接 Bitget 做只读验证，但不会下单。重点检查 API 权限、IP 白名单、统一账户设置、交易品种是否为精确在线合约，以及电脑时间是否同步。Agent 还会拒绝提现权限、过期计划、错误的止损止盈顺序、行情过旧和缺少保护条件。只有检查全部通过，才说明技术接入正确；这并不代表策略一定盈利。"),
    ("试运行风险提示", ["当前仍在试运行，不承诺收益", "不建议大仓位，不满仓，不高杠杆", "先观察 PAPER，再用可承受损失的极小资金", "不同方法分别记录至少 10 天，比较命中、回撤和执行质量", "异常时停止新增交易，保留减仓与保护能力"],
     "最后是风险提示。当前六种方法都处于试运行阶段，不承诺收益，也不能代替你的判断。不建议大仓位，更不要满仓或者高杠杆。先观察 PAPER，再用即使全部损失也不会影响生活的极小资金测试。六种方法应分别记录至少十天，比较命中率、最大回撤、滑点和保护单执行质量，而不是只看某一笔盈亏。发现异常时，先停止新增交易，同时保留减仓和保护已有仓位的能力。完成这些步骤，才算安全接入 MOOX AI 系统。"),
]

def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("MOOX", str(FONT)))
    pdfmetrics.registerFont(TTFont("MOOX-Bold", str(FONT_BOLD)))

def footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#DDD7C7"))
    canvas.line(18 * mm, 14 * mm, 192 * mm, 14 * mm)
    canvas.setFont("MOOX", 8)
    canvas.setFillColor(colors.HexColor("#655F54"))
    canvas.drawString(18 * mm, 9 * mm, "MOOX 会员 AI 交易接入 - 试运行版")
    canvas.drawRightString(192 * mm, 9 * mm, f"第 {doc.page} 页")
    canvas.restoreState()

def build_pdf() -> None:
    register_fonts()
    PDF.parent.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    title = ParagraphStyle("title", fontName="MOOX-Bold", fontSize=28, leading=38, textColor=colors.HexColor("#16130E"), alignment=TA_CENTER, spaceAfter=10 * mm)
    h1 = ParagraphStyle("h1", fontName="MOOX-Bold", fontSize=20, leading=28, textColor=colors.HexColor("#241E14"), spaceAfter=5 * mm)
    body = ParagraphStyle("body", fontName="MOOX", fontSize=10.5, leading=18, textColor=colors.HexColor("#383127"), spaceAfter=3 * mm)
    small = ParagraphStyle("small", fontName="MOOX", fontSize=8.5, leading=14, textColor=colors.HexColor("#655F54"))
    warn = ParagraphStyle("warn", fontName="MOOX-Bold", fontSize=11, leading=18, textColor=colors.HexColor("#7A321F"), backColor=colors.HexColor("#FFF0E8"), borderPadding=10, spaceBefore=3 * mm, spaceAfter=5 * mm)
    doc = SimpleDocTemplate(str(PDF), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=20 * mm, title="MOOX会员AI交易接入教程", author="MOOX Intelligence")
    story = [Spacer(1, 24 * mm), Paragraph("MOOX 会员 AI 交易<br/>安全接入教程", title), Paragraph("Bitget UTA + 本地 Agent | 2026-08 试运行版", ParagraphStyle("sub", parent=body, alignment=TA_CENTER, fontSize=13)), Spacer(1, 15 * mm), Paragraph("重要安全边界", h1), Paragraph("Bitget API Key、Secret Key、Passphrase 只保存在会员自己的电脑或 VPS。MOOX 网页不会提供上传这三项凭证的输入框。网站只签发可撤销、可过期的只读计划 Token。", warn), Paragraph("本教程用于帮助会员正确完成技术接入，不构成收益承诺。六种方法都在试运行，不建议大仓位，不建议高杠杆，更不建议满仓。", body), PageBreak()]
    sections = [
        ("一、准备环境", ["安装 Node.js 20 或更高版本。", "在会员页下载 Windows 一键包，完整解压后再运行。", "电脑系统时间开启自动同步。", "准备 LIVE 时必须绑定运行 Agent 的固定公网 IPv4；没有固定 IP 就保持 PAPER/DRY_RUN。"]),
        ("二、创建 MOOX 只读计划 Token", ["会员页点击“创建 90 天 Token”。", "Token 只显示一次，复制到 MOOX配置.txt 的 MOOX_SIGNAL_TOKEN= 后面。", "Token 丢失时撤销并重建，不要把 Bitget 密钥误填到这里。"]),
        ("三、先运行 PAPER", ["双击 1-启动PAPER.bat。PAPER 不连接 Bitget，不产生真实订单。", "确认能够读取品种、正式方向、入场区、止损、止盈和所选方法。", "无正式预测、证据不足、缠论冲突或点位无效时必须保持等待。"]),
        ("四、在 Bitget 创建 UTA API", ["Bitget 个人中心 -> API 管理 -> 创建 API。", "设置独立 Passphrase，并离线保存 Key、Secret、Passphrase。", "只开启 UTA 管理/读取与 UTA 交易；禁止提币、划转和不必要权限。", "准备 LIVE 时绑定运行 Agent 的固定公网 IPv4。"]),
    ]
    for heading, bullets in sections:
        story.append(Paragraph(heading, h1))
        story.extend(Paragraph(f"• {item}", body) for item in bullets)
        story.append(Spacer(1, 2 * mm))
    story += [PageBreak(), Paragraph("五、配置文件逐项填写", h1)]
    data = [[Paragraph("来源", small), Paragraph("粘贴位置", small), Paragraph("说明", small)],
            [Paragraph("MOOX 会员页 Token", body), Paragraph("MOOX_SIGNAL_TOKEN=", body), Paragraph("只读计划 Token，不是交易所密钥", body)],
            [Paragraph("Bitget API Key", body), Paragraph("BITGET_API_KEY=", body), Paragraph("只填等号右边", body)],
            [Paragraph("Bitget Secret Key", body), Paragraph("BITGET_API_SECRET=", body), Paragraph("只留本机，绝不发送", body)],
            [Paragraph("Bitget API Passphrase", body), Paragraph("BITGET_API_PASSPHRASE=", body), Paragraph("创建 API 时自己设置的口令", body)],
            [Paragraph("所选试运行方法", body), Paragraph("MOOX_METHOD=", body), Paragraph("填写下表中的英文代码", body)]]
    table = Table(data, colWidths=[45 * mm, 62 * mm, 67 * mm], repeatRows=1)
    table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#221D17")), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("GRID", (0, 0), (-1, -1), .4, colors.HexColor("#CFC7B6")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#FAF7F0")), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
    story += [table, Spacer(1, 5 * mm), Paragraph("示例值必须打码：BITGET_API_KEY=bg_****。不要添加引号，不要把等号左边的名称改掉。", warn), Paragraph("六、六种试运行方法", h1)]
    codes = ["LIUYAO", "QIMEN", "LIUYAO_QIMEN", "LIUYAO_CHAN", "QIMEN_CHAN", "LIUYAO_QIMEN_CHAN"]
    method_data = [[Paragraph("方法", small), Paragraph("MOOX_METHOD 代码", small), Paragraph("进入候选的证据门槛", small)]]
    for (n, name, desc), code in zip(METHODS, codes):
        method_data.append([Paragraph(f"{n}. {name}", body), Paragraph(code, body), Paragraph(desc, body)])
    mt = Table(method_data, colWidths=[52 * mm, 57 * mm, 65 * mm], repeatRows=1)
    mt.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3A245A")), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("GRID", (0, 0), (-1, -1), .4, colors.HexColor("#D3C8DE")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#FAF7FC")), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
    story += [mt, PageBreak(), Paragraph("七、运行 DRY_RUN", h1), Paragraph("保存配置后，双击 2-检查DRY_RUN.bat。DRY_RUN 只验证、不下单。它会检查 API 权限、IP 白名单、UTA 账户设置、精确合约、时间同步、行情新鲜度、计划有效期、点位顺序和保护条件。", body), Paragraph("如果检测到提现权限、缺少交易权限、未绑定 IP、计划过期、点位无效或保护条件不完整，必须停止，不要用放宽检查的方式强行通过。", warn), Paragraph("八、LIVE 试运行前清单", h1)]
    checks = ["PAPER 连续观察且逻辑符合预期", "DRY_RUN 全部通过", "API 无提现/划转权限并绑定固定 IPv4", "账户内只放可承受全部损失的极小测试资金", "确认止损、止盈、最大仓位和杠杆上限", "明白本包没有一键 LIVE 按钮，LIVE 需要本机明确双重确认", "知道如何运行 3-停止新增交易.bat，并理解已有仓位仍需保护/减仓"]
    story.extend(Paragraph(f"□ {item}", body) for item in checks)
    story += [Paragraph("九、风险与试运行规则", h1), Paragraph("当前不承诺收益。建议六种方法分别记录至少 10 天，比较命中率、最大回撤、滑点、止损执行和保护单完整性。不要只依据一笔盈亏判断。用户可选择跟随哪一种方法，但任何方法都不能逆转正式锁定方向，也不能绕过统一风控。", body), Paragraph("不建议大仓位，不满仓，不高杠杆。先 PAPER，再 DRY_RUN，最后只用可承受损失的极小资金试运行。", warn), Spacer(1, 3 * mm), Paragraph("官方参考", h1), Paragraph("Bitget API 创建指南：https://www.bitget.com/support/articles/360038968251-API-Creation-Guide", small), Paragraph("Bitget UTA Quick Start：https://www.bitget.com/api-doc/uta/guide", small), Paragraph("Bitget UTA Account Info（权限与 IP）：https://www.bitget.com/api-doc/uta/account/Get-Account-Info", small), Paragraph("Bitget UTA Account Settings：https://www.bitget.com/api-doc/uta/account/Get-Account-Setting", small)]
    doc.build(story, onFirstPage=footer, onLaterPages=footer)

def wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines, current = [], ""
    for char in text:
        candidate = current + char
        if draw.textlength(candidate, font=font) > width and current:
            lines.append(current); current = char
        else:
            current = candidate
    if current: lines.append(current)
    return lines

def build_slide(index: int, title: str, bullets: list[str]) -> Path:
    image = Image.new("RGB", (1920, 1080), "#080A10")
    draw = ImageDraw.Draw(image)
    title_font = ImageFont.truetype(str(FONT_BOLD), 64)
    body_font = ImageFont.truetype(str(FONT), 34)
    small_font = ImageFont.truetype(str(FONT), 24)
    draw.rounded_rectangle((70, 62, 1850, 1015), radius=38, fill="#11141D", outline="#66502D", width=2)
    draw.text((115, 100), "MOOX 会员 AI 交易接入", font=small_font, fill="#E4C47A")
    draw.text((115, 160), title, font=title_font, fill="#FFFFFF")
    y = 285
    for bullet in bullets:
        draw.ellipse((120, y + 13, 138, y + 31), fill="#B895E9")
        lines = wrap(draw, bullet, body_font, 1540)
        for line in lines:
            draw.text((165, y), line, font=body_font, fill="#D9DCE5")
            y += 52
        y += 27
    draw.text((115, 955), "试运行阶段 | 不建议大仓位 | API 密钥只留本机", font=small_font, fill="#C4A96A")
    draw.text((1745, 955), f"{index}/{len(SLIDES)}", font=small_font, fill="#868A97")
    path = TMP / f"slide-{index:02d}.png"
    image.save(path, quality=95)
    return path

async def speech(text: str, path: Path) -> None:
    await edge_tts.Communicate(text, "zh-CN-XiaoxiaoNeural", rate="-4%", pitch="-2Hz").save(str(path))

async def build_speech_batch(paths: list[Path]) -> None:
    await asyncio.gather(*(speech(item[2], path) for item, path in zip(SLIDES, paths)))

def run(command: list[str]) -> None:
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def build_video() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    slides = [build_slide(i, title, bullets) for i, (title, bullets, _) in enumerate(SLIDES, 1)]
    slides[0].replace(POSTER) if False else Image.open(slides[0]).save(POSTER)
    audio = [TMP / f"audio-{i:02d}.mp3" for i in range(1, len(SLIDES) + 1)]
    asyncio.run(build_speech_batch(audio))
    segments = []
    for i, (slide, mp3) in enumerate(zip(slides, audio), 1):
        duration = MP3(mp3).info.length + 0.5
        segment = TMP / f"segment-{i:02d}.mp4"
        run([str(FFMPEG), "-y", "-loop", "1", "-i", str(slide), "-i", str(mp3), "-t", f"{duration:.3f}", "-vf", "scale=1280:720", "-c:v", "libx264", "-preset", "medium", "-tune", "stillimage", "-b:v", "28k", "-maxrate", "36k", "-bufsize", "72k", "-r", "12", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "48k", "-ac", "1", "-ar", "32000", "-movflags", "+faststart", str(segment)])
        segments.append(segment)
    concat = TMP / "concat.txt"
    concat.write_text("\n".join(f"file '{p.as_posix()}'" for p in segments), encoding="utf-8")
    run([str(FFMPEG), "-y", "-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", "-movflags", "+faststart", str(VIDEO)])

if __name__ == "__main__":
    TMP.mkdir(parents=True, exist_ok=True)
    build_pdf()
    build_video()
    print(PDF)
    print(VIDEO)
