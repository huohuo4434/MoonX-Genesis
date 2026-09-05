import type { IntradayTechnicalLevels } from "@/lib/market-data/intraday-chan-levels";
import type { ChanInstrument } from "@/types/chan-execution";

export function technicalQuoteLabel(instrument: ChanInstrument | null): string {
  if (!instrument) return "行情标的未确认";
  const quote = instrument.providerSymbol;
  if (quote === "QQQ") return "QQQ ETF · 美元/份（非NDX指数点）";
  if (quote === "SPY") return "SPY ETF · 美元/份（非SPX指数点）";
  if (quote === "GC=F") return "GC=F 黄金期货 · 美元/盎司（非现货）";
  if (quote === "SI=F") return "SI=F 白银期货 · 美元/盎司（非现货）";
  if (instrument.provider === "BITGET_PUBLIC") return `${quote} · Bitget合约 · USDT`;
  return `${quote} · 技术参考行情`;
}

/** Presentation only: retain the provider's units; never convert ETF prices to index points. */
export function HomeTechnicalLevelView({ levels, instrument, mode = "cells" }: {
  levels: IntradayTechnicalLevels | null;
  instrument: ChanInstrument | null;
  mode?: "cells" | "inline";
}) {
  const available = Boolean(instrument && levels && levels.source !== "UNAVAILABLE");
  const support = available ? levels!.support : "—";
  const resistance = available ? levels!.resistance : "—";
  const quote = technicalQuoteLabel(instrument);
  const captured = levels?.capturedAt ? new Date(levels.capturedAt) : null;
  const readAt = available && captured && Number.isFinite(captured.getTime())
    ? `${new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(captured)} 北京时间`
    : null;
  const status = available ? `${levels!.primaryTimeframe ?? ""}技术参考` : "技术行情暂不可用";
  const caption = <span className="mt-1 block text-[11px] leading-5 text-white/55">{quote}<br />{status}{readAt ? ` · 读取 ${readAt}` : ""}</span>;
  if (mode === "inline") return <div data-home-technical-levels className="mt-3 text-[11px] text-white/65"><div className="flex flex-wrap justify-between gap-3"><span>支撑 {support}</span><span>压力 {resistance}</span></div>{caption}</div>;
  return <><td className="px-3 py-3 text-sm text-white/75" data-home-technical-levels>{support}{caption}</td><td className="px-3 py-3 text-sm text-white/75">{resistance}</td></>;
}
