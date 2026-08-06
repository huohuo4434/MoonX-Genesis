import { z, type ZodType } from "zod";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("AI返回空内容");
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
    if (fenced) return JSON.parse(fenced) as unknown;
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    throw new Error("AI返回内容不是有效JSON");
  }
}

export interface ModelJsonCallOptions<T> {
  system: string;
  user: string;
  schema: ZodType<T>;
  timeoutMs?: number;
}

export async function callCommitteeModel<T>(options: ModelJsonCallOptions<T>): Promise<{
  value: T;
  model: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("未配置 OPENAI_API_KEY，无法运行AI研究委员会");

  const model = process.env.MOOX_COMMITTEE_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 45_000);

  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.15,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.user },
        ],
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 800);
      throw new Error(`AI委员会调用失败（HTTP ${response.status}）：${detail}`);
    }

    const payload = z
      .object({
        choices: z.array(
          z.object({
            message: z.object({ content: z.string().nullable() }),
          })
        ).min(1),
      })
      .parse(await response.json());

    const raw = extractJson(payload.choices[0]?.message.content ?? "");
    const parsed = options.schema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`AI委员会JSON不符合结构：${parsed.error.issues.slice(0, 5).map((item) => item.message).join("；")}`);
    }
    return { value: parsed.data, model };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI委员会调用超时，请稍后重试或减少输入长度");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
