import type { DailyForecast } from "@/types/daily-forecast";

type ExtendedDaily = DailyForecast & {
  qimenEvidence?: string;
  liuyaoEvidence?: string;
  qimenMysticNote?: string;
  qimenAgreementLabel?: string;
};

function field(text: string | undefined, key: string): string {
  if (!text) return "";
  const hit = text.split("；").find((part) => part.startsWith(`${key}=`));
  return hit ? hit.slice(key.length + 1).trim() : "";
}

function firstCompleteClauses(text: string, max = 2): string {
  const cleaned = text
    .replace(/【奇门主判】[^\n。；]*(?:[。；]|$)/g, "")
    .replace(/技术分析只负责[^。；]*(?:[。；]|$)/g, "")
    .replace(/不编造具体变盘日[^。；]*(?:[。；]|$)/g, "")
    .replace(/若8月中旬已经明显上涨[。；]?/g, "")
    .replace(/完整研究依据按需展开[^。；]*(?:[。；]|$)/g, "")
    .replace(/先看明确方向[^。；]*(?:[。；]|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const parts = cleaned.split(/[。；]/).map((item) => item.trim()).filter(Boolean);
  return parts.slice(0, max).join("；");
}

function qimenPalaceLine(evidence: string | undefined): string {
  if (!evidence) return "";
  const direction = field(evidence, "奇门主判");
  const yongshen = field(evidence, "金融用神");
  const palaceBlob = field(evidence, "九宫");
  const primaryStem = yongshen.match(/^([甲乙丙丁戊己庚辛壬癸])/u)?.[1] ?? "";
  let palaceText = "";
  if (primaryStem && palaceBlob) {
    const segment = palaceBlob.split("/").find((part) => part.includes(`|天${primaryStem}|`));
    if (segment) {
      const match = segment.match(/^(\d)([^[]+)\[地[^|]*\|天[^|]*\|([^|]*)\|([^|]*)\|([^|]*)\|([^\]]*)\]/u);
      if (match) {
        const [, number, trigram, star, door, deity, status] = match;
        const omens = [star, door, deity].filter((value) => value && value !== "—").slice(0, 3).join("、");
        const state = status && status !== "平" ? `，${status.replaceAll("+", "、")}` : "";
        palaceText = `${primaryStem}落${trigram}${number}宫${omens ? `，${omens}同宫` : ""}${state}`;
      }
    }
  }
  if (!palaceText) {
    const chiefStar = field(evidence, "值符");
    const chiefDoor = field(evidence, "值使");
    palaceText = [chiefStar ? `值符${chiefStar}` : "", chiefDoor ? `值使${chiefDoor}` : ""].filter(Boolean).join("，");
  }
  return [palaceText, direction ? `综合判${direction}` : ""].filter(Boolean).join("，");
}

export function cleanDailyLevel(value: string | undefined): string {
  if (!value) return "行情数据异常";
  return value
    .replace(/^(第一|第二|第三)?(支撑|压力)(区|位)?[：:]\s*/u, "")
    .replace(/[（(][^）)]*[）)]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim() || "行情数据异常";
}

export function buildDailyInvalidation(forecast: DailyForecast): string {
  const explicit = firstCompleteClauses(forecast.invalidation ?? "", 1);
  if (explicit && /\d/.test(explicit) && !/按页面|待补充|技术风控/u.test(explicit)) return explicit;
  const support = cleanDailyLevel(forecast.supportLevels?.[0]);
  const resistance = cleanDailyLevel(forecast.resistanceLevels?.[0]);
  const direction = forecast.directionLabel || forecast.direction;
  if (support === "行情数据异常" || resistance === "行情数据异常") return "1H技术位刷新中";
  if (/上涨|回升|看涨/u.test(direction)) return `有效跌破${support}，今日看涨判断失效`;
  if (/下跌|回落|看跌/u.test(direction)) return `有效站上${resistance}，今日看跌判断失效`;
  return `有效突破${resistance}或跌破${support}，今日震荡判断失效`;
}

export function buildDailyResearchReason(forecast: DailyForecast): string {
  const row = forecast as ExtendedDaily;
  const liuyao = firstCompleteClauses(row.liuyaoEvidence ?? "", 2)
    .replace(/^本周主卦—[。；]?/u, "")
    .trim();
  const qimen = qimenPalaceLine(row.qimenEvidence) || firstCompleteClauses(row.qimenMysticNote ?? "", 1);
  const direction = forecast.directionLabel || forecast.direction;
  const relation = row.qimenAgreementLabel?.includes("共振")
    ? "两法同向"
    : row.qimenAgreementLabel?.includes("分歧")
      ? "两法分歧"
      : "";
  const parts = [
    liuyao ? `六爻：${liuyao}` : "",
    qimen ? `奇门：${qimen}` : "",
    `结论：${direction}${relation ? `，${relation}` : ""}`,
  ].filter(Boolean);
  return parts.join("；");
}

export function buildHomeResearchReason(forecast: DailyForecast): string {
  const row = forecast as ExtendedDaily;
  const qimen = qimenPalaceLine(row.qimenEvidence) || firstCompleteClauses(row.qimenMysticNote ?? "", 1);
  const liuyao = firstCompleteClauses(row.liuyaoEvidence ?? "", 1).replace(/^本周主卦—[。；]?/u, "").trim();
  return [qimen ? `奇门：${qimen}` : "", liuyao ? `六爻：${liuyao}` : ""].filter(Boolean).join("；");
}
