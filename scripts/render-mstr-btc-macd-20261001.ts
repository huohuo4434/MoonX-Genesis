import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { macdSketches } from "../content/public-notes/mstr-btc-macd-20261001";

const folder = resolve("public/images/public-notes/20261001");
mkdirSync(folder, { recursive: true });
const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const text = (x: number, y: number, s: string, size = 22, color = "#c4d2e5", anchor = "start") => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${escape(s)}</text>`;
function shell(title: string, en: boolean) {
  return [`<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="800" viewBox="0 0 1240 800" role="img" aria-labelledby="title desc"><title id="title">${escape(title)}</title><desc id="desc">${en ? "Manually constructed schematic, not observed prices, indicator values or future OHLC." : "人工构造示意，非实际价格、指标读数或精确未来四价。"}</desc><rect width="1240" height="800" fill="#0b1220"/><g font-family="Arial, Microsoft YaHei, sans-serif">`, text(48, 54, title, 30, "#edf6ff"), text(48, 92, en ? "Teacher Yi’s Views · October 1, 2026 · RESEARCH ONLY" : "易老师观点 · 2026年10月1日 · 个人研究", 20), `<rect x="48" y="114" width="1144" height="48" rx="8" fill="#382c18"/>`, text(65, 146, en ? "SCHEMATIC — no live data, exact targets or turning dates" : "模拟示意 — 不代表实时数据、精确目标价或转折日期", 23, "#ffd48a")];
}
for (const en of [false, true]) {
  const locale = en ? "en" : "zh";
  for (const asset of ["mstr", "btc"] as const) {
    const parts = shell(`${asset.toUpperCase()} · ${en ? "Four-week corrective scenario" : "未来四周回调情景"}`, en);
    const x = (i: number) => 220 + i * 225;
    const y = (position: number) => 590 - (position - 65) * 7;
    parts.push(text(48, 206, en ? "Relative position only — NOT price or percentage return" : "纵轴只表示示意位置，不表示价格或涨跌百分比", 20), `<rect x="145" y="232" width="1025" height="385" fill="#fbbf24" opacity=".045"/>`);
    for (const position of [75, 85, 100, 115]) parts.push(`<path d="M145 ${y(position)}H1170" stroke="#29374b" stroke-dasharray="${position === 100 ? "7 6" : "0"}"/>`);
    parts.push(text(133, y(115) + 6, en ? "Higher" : "偏高", 19, "#9cacc2", "end"), text(133, y(100) + 6, en ? "Reference" : "参考位置", 17, "#d4e3f5", "end"), text(133, y(75) + 6, en ? "Lower" : "偏低", 19, "#9cacc2", "end"));
    macdSketches[asset].forEach(([o, h, l, c], i) => {
      const color = c >= o ? "#35d9b4" : "#fb7185";
      parts.push(`<g data-kind="synthetic" data-week="${i + 1}"><path d="M${x(i)} ${y(h)}V${y(l)}" stroke="${color}" stroke-width="3"/><rect x="${x(i) - 25}" y="${Math.min(y(o), y(c))}" width="50" height="${Math.max(3, Math.abs(y(o) - y(c)))}" fill="#0b1220" stroke="${color}" stroke-width="3"/></g>`, text(x(i), 650, en ? `Week ${i + 1}` : `第${i + 1}周`, 23, "#d5e0ef", "middle"));
    });
    parts.push(`<path d="M${x(0)} ${y(100)}L${x(1)} ${y(103)}L${x(2)} ${y(109)}L${x(3)} ${y(117)}" fill="none" stroke="#8baaff" stroke-width="3" stroke-dasharray="8 7"/>`, `<path d="M${x(0)} ${y(100)}L${x(1)} ${y(85)}L${x(2)} ${y(76)}L${x(3)} ${y(66)}" fill="none" stroke="#e7b36a" stroke-width="3" stroke-dasharray="8 7"/>`);
    parts.push(text(48, 699, en ? "Hollow candles: base case · Pullback → bounce → renewed support test" : "空心蜡烛：主要情景 · 回落试支撑 → 反抽 → 再次检验支撑", 21), text(48, 736, en ? "Blue dashed: sustained breakout revises the view · Gold dashed: weakness extends" : "蓝虚线：有效突破，修正偏空观点  ·  金虚线：结构继续转弱，调整延长", 20), text(48, 775, en ? "Synthetic weekly shapes, not predicted weekly OHLC. Review conditions each week." : "每根均为人工周度形状，不是未来周线四价预测；按条件逐周复核。", 18));
    parts.push("</g></svg>");
    writeFileSync(resolve(folder, `${asset}-${locale}.svg`), parts.join("\n"));
  }
  const parts = shell(en ? "Weekly recovery + shorter-term divergence" : "周线修复到关口，小周期动能开始减弱", en);
  const boxes: readonly (readonly [string, string, string])[] = [
    en ? ["WEEKLY CONTEXT", "MACD rises toward zero", "Recovery meets a structural test"] : ["周线：大背景", "DIF从负值修复到零轴附近", "价格仍需突破压力并守住回踩"],
    en ? ["DAILY / TWO-DAY WARNING", "Higher price high, lower MACD high", "Divergence + bearish crossover"] : ["日线／2日线：预警", "价格高点抬升，动能高点降低", "顶背离 + 死叉，反弹质量下降"],
    en ? ["PRICE CONFIRMATION", "Support breaks; recovery fails", "Lower highs and lows strengthen the case"] : ["价格：确认", "支撑失守，反抽不能收复", "更低的高点与低点强化回调判断"],
  ];
  boxes.forEach((lines, i) => {
    const yy = 192 + i * 155;
    parts.push(`<rect x="85" y="${yy}" width="1070" height="126" rx="14" fill="#112033" stroke="#365168"/>`, text(113, yy + 36, lines[0], 22, "#6ee7b7"), text(113, yy + 72, lines[1], 26, "#eff6ff"), text(113, yy + 105, lines[2], 21));
    if (i < 2) parts.push(`<path d="M620 ${yy + 132}v14m-7-7 7 7 7-7" fill="none" stroke="#77a491" stroke-width="3"/>`);
  });
  parts.push(text(48, 699, en ? "My base view: at least one month of correction, with intervening rallies" : "易老师主要判断：至少一个月偏回调，中间允许反弹", 24, "#ffd48a"), text(48, 741, en ? "A sustained breakout + successful retest can invalidate the bearish view" : "有效突破 + 回踩不破 + 动能扩张，可使偏空判断失效", 22), text(48, 779, en ? "This combination has no established fixed correction duration in the cited guides." : "所查指标资料没有给出这一组合的固定回调周数。", 20));
  parts.push("</g></svg>");
  writeFileSync(resolve(folder, `structure-${locale}.svg`), parts.join("\n"));
}
console.log("Rendered 6 bilingual MACD structure and scenario illustrations");
