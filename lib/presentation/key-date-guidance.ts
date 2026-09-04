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

export const SANDISK_KEY_DATE_CORRECTION = "闪迪综合应对：9/4不因日期清仓。计划参与9/7后转强阶段的，回踩企稳可观察分批布局，破位则先控风险；已冲高受阻的短线仓可保护利润。9/5—7美股休市，9/8复市，不安排“4日逃顶、7日抄底”的来回交易。";
