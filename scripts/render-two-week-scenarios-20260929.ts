import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { scenarioAssets, illustrativeBars, type ScenarioAsset } from "../content/public-notes/two-week-scenarios-20260929";

const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const folder = resolve("public/images/public-notes/20260929");
mkdirSync(folder, { recursive: true });
export function renderScenario(asset: ScenarioAsset, en: boolean) {
  const simulated = illustrativeBars(asset);
  const observations = [...asset.history, ...simulated];
  const low = Math.min(...observations.map(b=>b[3]),asset.weakEnd,...asset.levels);
  const high = Math.max(...observations.map(b=>b[2]),asset.strongEnd,...asset.levels);
  const pad = (high-low)*0.1;
  const min = low-pad, max=high+pad;
  const left=100, right=1120, top=185, bottom=590;
  const first=Date.parse(asset.history[0][0]); const last=Date.parse("2026-10-10");
  const x=(d:string)=>left+(Date.parse(d)-first)/(last-first)*(right-left);
  const y=(p:number)=>bottom-(p-min)/(max-min)*(bottom-top);
  const split=x("2026-09-30")-12;
  const fmt=(n:number)=>Math.round(n).toLocaleString("en-US");
  const text=(xx:number, yy:number, s:string, size=16, color="#b7c5d8", anchor="start")=>`<text x="${xx}" y="${yy}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${escape(s)}</text>`;
  const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="800" viewBox="0 0 1240 800" role="img" aria-labelledby="title desc"><title id="title">${escape(asset.name[en?1:0])} ${en?"illustrative future candles":"未来模拟K线"}</title><desc id="desc">${en?"Filled candles: observed completed daily bars. Hollow candles: manually constructed scenarios, not predictions of daily OHLC. Dashed alternatives have no assigned probability.":"实心为已收盘历史日K，空心为人工构造的未来情景，不是精确每日四价预测；虚线路径未赋予概率。"}</desc><rect width="1240" height="800" fill="#0b1220"/><g font-family="Arial, Microsoft YaHei, sans-serif">`];
  parts.push(text(48,48,`${asset.name[en?1:0]} · ${en?"Two-week scenarios":"两周条件模拟"}`,27,"#f0f5fc"));
  parts.push(text(48,82,en?"Teacher Yi · Research only · Review cutoff: Sep 29, 2026, 20:20 Beijing":"易老师 · 研究随笔 · 资料核验截止：2026-09-29 20:20 北京时间",16));
  parts.push(`<rect x="48" y="101" width="1144" height="43" rx="6" fill="#382c18"/>`,text(64,129,en?"SIMULATION — hollow future candles and exact turning dates are illustrative, NOT price forecasts":"模拟示意 — 空心未来蜡烛及转折日期均为人工构造，不是精确价格预测",20,"#ffd48a"));
  parts.push(`<rect x="${split}" y="${top}" width="${right-split}" height="${bottom-top}" fill="#fbbf24" opacity="0.055"/>`);
  if(asset.calendar==="cn") parts.push(`<rect x="${x("2026-10-01")}" y="${top}" width="${x("2026-10-08")-x("2026-10-01")-12}" height="${bottom-top}" fill="#94a3b8" opacity="0.1"/>`,text(x("2026-10-04"),top+90,en?"Oct 1–7: market closed":"10/1—7 休市，无K线",15,"#cbd5e1","middle"));
  for(let i=0;i<=5;i++) {
    const value=min+(max-min)*i/5; const yy=y(value);
    parts.push(`<path d="M${left} ${yy}H${right}" stroke="#243247"/>`,text(left-14,yy+5,fmt(value),15,"#aebed3","end"));
  }
  for(const value of asset.levels) parts.push(`<path d="M${left} ${y(value)}H${right}" stroke="#70839f" stroke-dasharray="4 6" opacity="0.55"/>`);
  const candle=(b:readonly [string,number,number,number,number], future:boolean)=>{
    const [date,o,h,l,c]=b;const xx=x(date);const color=c>=o?"#35d9b4":"#fb7185";
    return `<g data-kind="${future?"synthetic":"observed"}" data-date="${date}"><title>${date} · ${future?(en?"ILLUSTRATIVE / NOT FORECAST OHLC":"模拟四价，非精确预测"):(en?"observed daily OHLC":"历史日线四价")} · O ${o} H ${h} L ${l} C ${c}</title><path d="M${xx} ${y(h)}V${y(l)}" stroke="${color}" stroke-width="2"/><rect x="${xx-8}" y="${Math.min(y(o),y(c))}" width="16" height="${Math.max(2,Math.abs(y(c)-y(o)))}" fill="${future?"#0b1220":color}" stroke="${color}" stroke-width="2"/></g>`;
  };
  parts.push(...asset.history.map(b=>candle(b,false)),...simulated.map(b=>candle(b,true)));
  const start=asset.history[asset.history.length-1];
  const alternate=(end:number,color:string)=>`<path d="M${x(start[0])} ${y(start[4])} L${x("2026-10-05")} ${y((start[4]+end)/2)} L${x(simulated[simulated.length-1][0])} ${y(end)}" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="7 6"/>`;
  parts.push(alternate(asset.weakEnd,"#e7b36a"),alternate(asset.strongEnd,"#8baaff"));
  parts.push(`<path d="M${split} ${top}V${bottom}" stroke="#f4bc65" stroke-dasharray="6 5"/>`);
  parts.push(text(left,169,en?"OBSERVED / completed daily bars":"真实历史 / 已收盘日K",16,"#dde7f7"),text(split+12,169,en?"ILLUSTRATIVE / from Sep 30":"未来情景 / 从9月30日起",16,"#ffd48a"));
  for(const date of [asset.history[0][0],"2026-09-28","2026-09-30","2026-10-05","2026-10-10"]){
    if(date===asset.history[0][0] && Date.parse("2026-09-28")-first<86400000*2)continue;
    parts.push(text(x(date),bottom+29,date.slice(5).replace("-","/"),16,"#c0cee0","middle"));
  }
  parts.push(text(left,top-35,asset.unit,14),text((left+right)/2,650,en?"This week: through Oct 3  |  Next week: Oct 5–10  |  calendar spacing":"本周：截至10月3日  |  下周：10月5—10日  |  按自然日期间距",16,"#b7c5d8","middle"));
  parts.push(text(48,690,en?"Filled: history · Hollow: central illustration":"实心：历史  ·  空心：试支撑／修复示意",17,"#d8e4f5"));
  parts.push('<path d="M640 684h40" stroke="#e7b36a" stroke-width="3" stroke-dasharray="7 6"/>',text(690,690,en?"Weaker":"转弱分支",17,"#e7b36a"));
  parts.push('<path d="M895 684h40" stroke="#8baaff" stroke-width="3" stroke-dasharray="7 6"/>',text(945,690,en?"Stronger":"转强分支",17,"#8baaff"));
  parts.push(text(48,724,(en?"Reference levels: ":"观察价位：")+asset.levels.map(fmt).join(" / "),18,"#f2c888"));
  parts.push(text(48,762,en?"No probability assigned. Not live quotes, guaranteed targets or trading instructions. Source and conditions in article.":"没有赋予命中概率；非实时行情、保证目标或交易指令。来源与确认条件见正文。",16));
  parts.push("</g></svg>"); return parts.join("\n");
}
for(const asset of scenarioAssets) for(const locale of ["zh","en"]) writeFileSync(resolve(folder,`${asset.id}-${locale}.svg`),renderScenario(asset,locale==="en"));
console.log(`Rendered ${scenarioAssets.length*2} static bilingual scenario charts`);
