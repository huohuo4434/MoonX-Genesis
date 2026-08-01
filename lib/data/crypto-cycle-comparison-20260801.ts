import type { ConvictionPeriodForecast } from "@/lib/data/conviction/asteroid-forecasts";
import { listBtcPeriodForecasts20260801 } from "@/lib/data/conviction/btc-forecasts-20260801";
import { listEthPeriodForecasts } from "@/lib/data/conviction/eth-forecasts";

export type CryptoCycleAlignment = {
  id: string;
  period: string;
  btcDirection: string;
  ethDirection: string;
  alignment: "高度一致" | "部分一致" | "明显分化";
  conclusion: string;
  tradingMeaning: string;
};

export const BTC_ETH_CYCLE_ALIGNMENTS_20260801: CryptoCycleAlignment[] = [
  {
    id: "BTC-ETH-ALIGN-20260801-0809",
    period: "2026-08-01 至 2026-08-09",
    btcDirection: "震荡修复",
    ethDirection: "先难后修复",
    alignment: "高度一致",
    conclusion: "两套独立卦都指向上旬资金不足、先难后缓，不支持立即进入持续主升。",
    tradingMeaning: "共同信号仅支持等待修复，不支持大阳线追涨。",
  },
  {
    id: "BTC-ETH-ALIGN-20260810-0816",
    period: "2026-08-10 至 2026-08-16",
    btcDirection: "震荡上涨",
    ethDirection: "震荡上涨",
    alignment: "高度一致",
    conclusion: "两者财爻金均在申月得到扶助，是八月最明确的共同上涨窗口。",
    tradingMeaning: "这是BTC与ETH八月共识最高的时间段，但六冲结构要求控制仓位和移动止损。",
  },
  {
    id: "BTC-ETH-ALIGN-20260817-0823",
    period: "2026-08-17 至 2026-08-23",
    btcDirection: "震荡下跌",
    ethDirection: "震荡上涨",
    alignment: "明显分化",
    conclusion: "BTC财爻空而受申冲，动爻多化兄弟；ETH财爻持世且双财同现，ETH相对更强。",
    tradingMeaning: "不得把本周写成整个加密市场共同看涨或共同看跌，应使用ETH/BTC相对强弱框架。",
  },
  {
    id: "BTC-ETH-ALIGN-20260824-0830",
    period: "2026-08-24 至 2026-08-30",
    btcDirection: "探底回升",
    ethDirection: "探底回升",
    alignment: "高度一致",
    conclusion: "两者均指向前期风险释放后修复，ETH官鬼化财，修复弹性可能略强。",
    tradingMeaning: "只在支撑确认后参与修复，不将反弹自动升级为新主升。",
  },
  {
    id: "BTC-ETH-ALIGN-3M",
    period: "未来3个月",
    btcDirection: "八月反弹、九月转弱、十月修复",
    ethDirection: "八月至九月偏强、十月结构转弱",
    alignment: "部分一致",
    conclusion: "共同确认八月存在上涨窗口和秋季转折；分歧在于ETH强势可能延续得比BTC更晚。",
    tradingMeaning: "八月底至九月上旬重点观察BTC先转弱、ETH补涨或相对强势的可能。",
  },
  {
    id: "BTC-ETH-ALIGN-1Y",
    period: "未来1年",
    btcDirection: "高波动震荡上涨",
    ethDirection: "前段冲高、后程调整",
    alignment: "明显分化",
    conclusion: "BTC变卦财爻持世，资金和制度化结构更强；ETH财化兄并受回头克，后程压力更明显。",
    tradingMeaning: "一年尺度BTC应给予更高战略权重，ETH更适合周期交易而不是无条件长期持有。",
  },
  {
    id: "BTC-ETH-ALIGN-10Y",
    period: "未来10年",
    btcDirection: "存续、全球金融化、多轮牛熊",
    ethDirection: "存续、周期扩张、竞争消耗",
    alignment: "高度一致",
    conclusion: "两者均不支持归零，也不支持十年直线上涨；共同指向长期存续和多轮深度回撤。",
    tradingMeaning: "长期价值来自跨周期管理。BTC更偏制度化货币资产，ETH更偏受竞争与成本约束的平台资产。",
  },
];

export function getBtcEthCycleBundle(): {
  btc: ConvictionPeriodForecast[];
  eth: ConvictionPeriodForecast[];
  alignments: CryptoCycleAlignment[];
} {
  return {
    btc: listBtcPeriodForecasts20260801(),
    eth: listEthPeriodForecasts(),
    alignments: BTC_ETH_CYCLE_ALIGNMENTS_20260801,
  };
}
