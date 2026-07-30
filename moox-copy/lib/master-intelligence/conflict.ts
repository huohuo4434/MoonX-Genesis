/**
 * Detect opposing teacher statements on the same motif (e.g. 兄弟持世).
 */
const MOTIFS = ["兄弟持世", "财伏藏", "官鬼", "子孙制鬼", "月破", "化退", "用神", "妻财"];

const BULLISH = /上涨|看涨|偏多|利多|做多|涨/;
const BEARISH = /下跌|看跌|偏空|利空|做空|跌/;

export type ConflictPairInput = {
  id: string;
  text: string;
  lessonId?: string;
};

export type DetectedConflict = {
  motif: string;
  left: ConflictPairInput;
  right: ConflictPairInput;
  hypothesizedCause: string;
};

export function detectRuleConflicts(items: ConflictPairInput[]): DetectedConflict[] {
  const out: DetectedConflict[] = [];
  for (const motif of MOTIFS) {
    const related = items.filter((i) => i.text.includes(motif));
    for (let i = 0; i < related.length; i++) {
      for (let j = i + 1; j < related.length; j++) {
        const a = related[i]!;
        const b = related[j]!;
        const aUp = BULLISH.test(a.text);
        const aDown = BEARISH.test(a.text);
        const bUp = BULLISH.test(b.text);
        const bDown = BEARISH.test(b.text);
        if ((aUp && bDown) || (aDown && bUp)) {
          out.push({
            motif,
            left: a,
            right: b,
            hypothesizedCause: "可能原因：月份、资产、条件或例外不同，请管理员确认。",
          });
        }
      }
    }
  }
  return out;
}
