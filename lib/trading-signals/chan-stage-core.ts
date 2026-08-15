import type { ChanStage, ChanStructure, ChanZone } from "@/types/chan-execution";

const labels: Record<ChanStage["code"], [string, string]> = {
  SECOND_BUY_CONFIRMED: ["二买已确认", "Second buy confirmed"], THIRD_BUY_CONFIRMED: ["三买已确认", "Third buy confirmed"],
  SECOND_SELL_CONFIRMED: ["二卖已确认", "Second sell confirmed"], THIRD_SELL_CONFIRMED: ["三卖已确认", "Third sell confirmed"],
  WAIT_SECOND_BUY_CONFIRMATION: ["等待二买确认", "Awaiting second-buy confirmation"], WAIT_THIRD_BUY_CONFIRMATION: ["等待三买回踩确认", "Awaiting third-buy pullback confirmation"],
  WAIT_SECOND_SELL_CONFIRMATION: ["等待二卖确认", "Awaiting second-sell confirmation"], WAIT_THIRD_SELL_CONFIRMATION: ["等待三卖回抽确认", "Awaiting third-sell rebound confirmation"],
  SECOND_BUY_INVALIDATED: ["二买结构失效", "Second-buy structure invalidated"], THIRD_BUY_INVALIDATED: ["三买结构失效", "Third-buy structure invalidated"],
  SECOND_SELL_INVALIDATED: ["二卖结构失效", "Second-sell structure invalidated"], THIRD_SELL_INVALIDATED: ["三卖结构失效", "Third-sell structure invalidated"],
  STRUCTURE_INCOMPLETE: ["结构证据不足", "Structure evidence insufficient"], NO_VALID_STAGE: ["暂无标准阶段", "No valid stage"],
};

function result(code: ChanStage["code"], status: ChanStage["status"], direction: ChanStage["direction"], confirmation: number | null, invalidation: number | null, waitingFor: string): ChanStage {
  const [labelZh, labelEn] = labels[code];
  return { code, labelZh, labelEn, status, direction, confirmation, invalidation, action: status === "ACTIVE" ? direction === "BULL" ? "BUY_CANDIDATE" : "SELL_CANDIDATE" : "WAIT", waitingFor };
}

function priorZone(zones: ChanZone[], breakoutIndex: number): ChanZone | undefined {
  return zones.filter((zone) => zone.endStroke < breakoutIndex).sort((a, b) => b.endStroke - a.endStroke || b.startStroke - a.startStroke)[0];
}

export function deriveChanStage(structure: ChanStructure): ChanStage {
  const lines = structure.strokes;
  if (!structure.sufficient || lines.length < 3) return result("STRUCTURE_INCOMPLETE", "INSUFFICIENT", "NEUTRAL", null, null, "等待足够的真实闭合K线与笔结构");
  const last4 = lines.slice(-4);
  if (structure.trendState === "COMPLETE" && last4.length === 4 && last4.every((line) => line.complete)) {
    const [a, , c, confirm] = last4;
    if (structure.buyPoint === "SECOND" && a!.direction === "DOWN" && c!.direction === "DOWN" && confirm!.direction === "UP" && c!.endPrice > a!.endPrice && confirm!.endPrice > c!.startPrice) return result("SECOND_BUY_CONFIRMED", "ACTIVE", "BULL", confirm!.endPrice, a!.endPrice, "已确认；等待正式方向与多周期共振");
    if (structure.sellPoint === "SECOND" && a!.direction === "UP" && c!.direction === "UP" && confirm!.direction === "DOWN" && c!.endPrice < a!.endPrice && confirm!.endPrice < c!.startPrice) return result("SECOND_SELL_CONFIRMED", "ACTIVE", "BEAR", confirm!.endPrice, a!.endPrice, "已确认；等待正式方向与多周期共振");
  }
  const last3 = lines.slice(-3);
  if (structure.trendState === "COMPLETE" && last3.length === 3 && last3.every((line) => line.complete)) {
    const [breakout, pullback, confirm] = last3;
    const zone = priorZone(structure.zones, lines.length - 3);
    if (zone && structure.buyPoint === "THIRD" && breakout!.direction === "UP" && pullback!.direction === "DOWN" && confirm!.direction === "UP" && Math.min(pullback!.startPrice, pullback!.endPrice) > zone.high) return result("THIRD_BUY_CONFIRMED", "ACTIVE", "BULL", confirm!.endPrice, zone.high, "已确认；等待正式方向与多周期共振");
    if (zone && structure.sellPoint === "THIRD" && breakout!.direction === "DOWN" && pullback!.direction === "UP" && confirm!.direction === "DOWN" && Math.max(pullback!.startPrice, pullback!.endPrice) < zone.low) return result("THIRD_SELL_CONFIRMED", "ACTIVE", "BEAR", confirm!.endPrice, zone.low, "已确认；等待正式方向与多周期共振");
  }
  const last2 = lines.slice(-2);
  if (last2.length === 2 && last2.every((line) => line.complete)) {
    const [breakout, pullback] = last2;
    const zone = priorZone(structure.zones, lines.length - 2);
    if (zone && breakout!.direction === "UP" && breakout!.endPrice > zone.high && pullback!.direction === "DOWN") {
      return Math.min(pullback!.startPrice, pullback!.endPrice) > zone.high
        ? result("WAIT_THIRD_BUY_CONFIRMATION", "AWAITING_CONFIRMATION", "BULL", pullback!.startPrice, zone.high, "等待向上确认笔，回到中枢上沿内即失效")
        : result("THIRD_BUY_INVALIDATED", "INVALIDATED", "BULL", null, zone.high, "回踩重新进入中枢，不构成三买");
    }
    if (zone && breakout!.direction === "DOWN" && breakout!.endPrice < zone.low && pullback!.direction === "UP") {
      return Math.max(pullback!.startPrice, pullback!.endPrice) < zone.low
        ? result("WAIT_THIRD_SELL_CONFIRMATION", "AWAITING_CONFIRMATION", "BEAR", pullback!.startPrice, zone.low, "等待向下确认笔，回到中枢下沿内即失效")
        : result("THIRD_SELL_INVALIDATED", "INVALIDATED", "BEAR", null, zone.low, "回抽重新进入中枢，不构成三卖");
    }
  }
  if (last3.length === 3 && last3.every((line) => line.complete)) {
    const [a, b, c] = last3;
    if (a!.direction === "DOWN" && b!.direction === "UP" && c!.direction === "DOWN") return c!.endPrice > a!.endPrice
      ? result("WAIT_SECOND_BUY_CONFIRMATION", "AWAITING_CONFIRMATION", "BULL", c!.startPrice, a!.endPrice, "等待向上确认笔；跌破前低即失效")
      : result("SECOND_BUY_INVALIDATED", "INVALIDATED", "BULL", null, a!.endPrice, "回踩跌破前低，不构成二买");
    if (a!.direction === "UP" && b!.direction === "DOWN" && c!.direction === "UP") return c!.endPrice < a!.endPrice
      ? result("WAIT_SECOND_SELL_CONFIRMATION", "AWAITING_CONFIRMATION", "BEAR", c!.startPrice, a!.endPrice, "等待向下确认笔；突破前高即失效")
      : result("SECOND_SELL_INVALIDATED", "INVALIDATED", "BEAR", null, a!.endPrice, "回抽突破前高，不构成二卖");
  }
  if (structure.trendState !== "COMPLETE") return result("STRUCTURE_INCOMPLETE", "INSUFFICIENT", "NEUTRAL", null, null, "等待当前最后一笔被完成线段覆盖");
  return result("NO_VALID_STAGE", "INSUFFICIENT", "NEUTRAL", null, null, "等待严格二买/三买或镜像卖点序列");
}
