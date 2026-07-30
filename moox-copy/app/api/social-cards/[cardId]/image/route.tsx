import { ImageResponse } from "next/og";
import { getSocialCardById } from "@/lib/social-cards/store";
import { getTodayForecastAccessPayload } from "@/lib/prediction-access-server";
import { getBeijingTodayKey } from "@/lib/calendar/beijing-date";
import type { SocialCardPublicPayload } from "@/types/social-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const WIDTH = 1200;
const HEIGHT = 675;

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-sc@latest/chinese-simplified-700-normal.woff",
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function lockedPayload(forecastDate: string): SocialCardPublicPayload {
  return {
    brand: "MOOX",
    forecastDate,
    assetName: "今日观点",
    symbol: "—",
    direction: "需登录",
    probability: "—",
    support: "—",
    resistance: "—",
    summary: "登录后可按账户权限查看完整预测。",
  };
}

function CardLayout({ payload }: { payload: SocialCardPublicPayload }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 56px",
        background: "linear-gradient(145deg, #0b0d12 0%, #12161f 55%, #1a2030 100%)",
        color: "#f4f6fb",
        fontFamily: "Noto Sans SC, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: 4 }}>{payload.brand}</div>
          <div style={{ fontSize: 22, color: "#9aa3b5" }}>每日市场预测 · {payload.forecastDate}</div>
        </div>
        <div
          style={{
            display: "flex",
            padding: "10px 18px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.18)",
            color: "#c9d1e0",
            fontSize: 18,
          }}
        >
          1200×675
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <div style={{ fontSize: 52, fontWeight: 700 }}>{payload.assetName}</div>
          <div style={{ fontSize: 28, color: "#9aa3b5" }}>{payload.symbol}</div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div
            style={{
              display: "flex",
              padding: "12px 20px",
              borderRadius: 14,
              background: "rgba(56, 189, 248, 0.14)",
              border: "1px solid rgba(56, 189, 248, 0.35)",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {payload.direction}
          </div>
          <div
            style={{
              display: "flex",
              padding: "12px 20px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 24,
            }}
          >
            {payload.probability}
          </div>
        </div>
        <div style={{ display: "flex", gap: 28, fontSize: 22, color: "#c9d1e0" }}>
          <div>支撑 {payload.support}</div>
          <div>压力 {payload.resistance}</div>
        </div>
        <div style={{ fontSize: 24, color: "#d7deea", lineHeight: 1.45, maxWidth: 980 }}>{payload.summary}</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, color: "#8b93a7" }}>
        <div>公开营销卡片 · 不含会员专享 / 六爻原文 / 内部权重</div>
        <div>mooxintel.com</div>
      </div>
    </div>
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await context.params;
  const access = await getTodayForecastAccessPayload();
  const beijingToday = getBeijingTodayKey();

  // Never leak direction / probability / levels to guests or pre-08:00 registered users.
  let payload: SocialCardPublicPayload = lockedPayload(beijingToday);
  if (access.allowed) {
    const card = await getSocialCardById(cardId);
    if (card?.payload && card.payload.forecastDate === beijingToday) {
      payload = card.payload;
    } else if (card?.payload) {
      // Stale or non-today cards stay locked for public image URLs.
      payload = lockedPayload(beijingToday);
    }
  }

  const fontData = await loadFont();
  return new ImageResponse(<CardLayout payload={payload} />, {
    width: WIDTH,
    height: HEIGHT,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
    fonts: fontData
      ? [
          {
            name: "Noto Sans SC",
            data: fontData,
            style: "normal",
            weight: 700,
          },
        ]
      : [],
  });
}
