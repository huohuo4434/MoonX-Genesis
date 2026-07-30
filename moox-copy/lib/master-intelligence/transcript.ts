/**
 * Clean transcript: punctuation/paragraphs/filler — never mutates raw.
 */
const FILLER = /(嗯+|啊+|呃+|额+|这个这个|那个那个|就是说|然后然后|对对对)/g;

/** Very light traditional → simplified map for common teaching chars. */
const TW_TO_CN: Record<string, string> = {
  財: "财",
  勢: "势",
  線: "线",
  漲: "涨",
  層: "层",
  時: "时",
  間: "间",
  應: "应",
  該: "该",
  見: "见",
  說: "说",
  們: "们",
  這: "这",
  還: "还",
  會: "会",
  麼: "么",
  個: "个",
  後: "后",
  來: "来",
  為: "为",
  與: "与",
  於: "于",
  從: "从",
  無: "无",
  對: "对",
  開: "开",
  關: "关",
};

export function simplifyTraditional(text: string): string {
  return [...text].map((ch) => TW_TO_CN[ch] ?? ch).join("");
}

export function stripFillers(text: string): string {
  return text.replace(FILLER, "").replace(/[ \t]{2,}/g, " ");
}

export function addBasicPunctuation(text: string): string {
  let t = text.replace(/\s*\n+\s*/g, "\n").trim();
  // Insert period before obvious topic shifts if missing
  t = t.replace(/([^\n。！？；])\n(?=[兄弟妻财官鬼父母子孙用神月破化退])/g, "$1。\n");
  if (t && !/[。！？]$/.test(t)) t += "。";
  return t;
}

export function paragraphize(text: string): string {
  const parts = text
    .split(/(?<=[。！？])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let buf: string[] = [];
  for (const p of parts) {
    buf.push(p);
    if (buf.join("").length >= 80) {
      chunks.push(buf.join(""));
      buf = [];
    }
  }
  if (buf.length) chunks.push(buf.join(""));
  return chunks.join("\n\n");
}

/** Produce Clean Transcript from Raw — Raw must remain untouched by callers. */
export function buildCleanTranscript(raw: string): string {
  const simplified = simplifyTraditional(raw);
  const noFiller = stripFillers(simplified);
  const punctuated = addBasicPunctuation(noFiller);
  return paragraphize(punctuated).trim();
}
