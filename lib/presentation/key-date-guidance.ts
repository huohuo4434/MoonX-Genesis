import { getNextForecastDate } from "@/lib/calendar/next-trading-day";
import { focusSessionMarket, isFocusTradingDay } from "@/lib/data/conviction/focus-market-session";
import type { KeyDateAction, KeyDateRadarItem } from "@/lib/data/key-date-radar-core";

type DateMeaning = Pick<KeyDateRadarItem, "assetId" | "focusDate" | "action" | "sourceDateType" | "sourceDateNote">;

/** Presentation only: never rewrite the source date, research action or locked forecast. */
export function keyDateGuidance(item: DateMeaning) {
  const market = focusSessionMarket(item.assetId);
  const closed = !isFocusTradingDay(item.assetId, item.focusDate);
  const uncertainSession = closed && market === "commodity";
  const type = item.sourceDateType;
  const group: KeyDateAction = closed || (type && type !== "阶段高点" && type !== "阶段低点")
    ? "TURNING_RISK" : item.action;
  const label = type === "下跌风险" ? "回撤风险观察"
    : type === "上涨候选" ? "转强观察"
      : type === "突破确认" ? "突破观察"
      : type === "阶段高点" ? "高点候选"
        : type === "阶段低点" ? "低点候选"
          : type ? "节奏观察"
            : item.action === "TOP_EXIT_WATCH" ? "高点候选"
              : item.action === "BOTTOM_WATCH" ? "低点候选" : "节奏观察";
  const condition = type === "下跌风险" ? "提示回撤可能，不代表当天见顶或必须卖出。"
    : type === "上涨候选" ? "观察转强，不代表当天最低或必须买入。"
      : group === "TOP_EXIT_WATCH" ? "先看冲高受阻和转弱确认，不按日期直接卖出。"
        : group === "BOTTOM_WATCH" ? "先看止跌和承接确认，不按日期直接买入。"
          : "只观察节奏，不按日期直接买卖。";
  const nextSessionDate = closed && !uncertainSession ? getNextForecastDate(market, item.focusDate) : null;
  const note = uncertainSession ? "交易时段须按具体商品或合约核实，非指定买卖日。" : closed
    ? `当日休市；${nextSessionDate}恢复交易后观察，非指定买卖日。`
    : `${condition}${item.sourceDateNote ? ` ${item.sourceDateNote}` : ""}`;
  return { group, label: uncertainSession ? `时段待核实 · ${label}` : closed ? `休市 · ${label}` : label, note, closed, nextSessionDate };
}

export const SANDISK_KEY_DATE_CORRECTION = "闪迪日期更正：9/4仅提示回撤风险，不是卖出日；9/7是转强阶段观察起点，美股休市，不是抄底日。9/8恢复交易后再看走势，不预设开盘买入。";
