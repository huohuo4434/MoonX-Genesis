export const ATTRIBUTION_FIRST_TOUCH_KEY = "moox_first_touch_v1";
export const ATTRIBUTION_LAST_TOUCH_KEY = "moox_last_touch_v1";
export const ATTRIBUTION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type SignupAttributionTouch = {
  source: string;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  landingPath: string;
  referrerHost: string | null;
  capturedAt: string;
};

function clean(value: string | null | undefined, max = 80): string | null {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized ? normalized.slice(0, max) : null;
}

function safeHost(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "").slice(0, 120) || null;
  } catch {
    return null;
  }
}

export function isXAttribution(touch: SignupAttributionTouch | null | undefined): boolean {
  if (!touch) return false;
  return [touch.source, touch.referrerHost].some((value) =>
    value === "x" || value === "twitter" || value === "x.com" || value === "twitter.com" || value === "t.co"
  );
}

export function buildSignupAttributionTouch(
  href: string,
  referrer: string,
  now = new Date()
): SignupAttributionTouch | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  const referrerHost = safeHost(referrer);
  const ownHost = url.hostname.toLowerCase().replace(/^www\./, "");
  const externalReferrer = referrerHost && referrerHost !== ownHost ? referrerHost : null;
  const source = clean(url.searchParams.get("utm_source")) ??
    (externalReferrer === "t.co" || externalReferrer === "x.com" || externalReferrer === "twitter.com"
      ? "x"
      : externalReferrer);
  const campaign = clean(url.searchParams.get("utm_campaign"), 120);
  if (!source && !campaign) return null;

  return {
    source: source ?? "campaign",
    medium: clean(url.searchParams.get("utm_medium")) ?? (externalReferrer ? "referral" : null),
    campaign,
    content: clean(url.searchParams.get("utm_content"), 120),
    landingPath: url.pathname.slice(0, 200) || "/",
    referrerHost: externalReferrer,
    capturedAt: now.toISOString(),
  };
}

export function parseSignupAttributionTouch(value: unknown): SignupAttributionTouch | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const source = clean(typeof raw.source === "string" ? raw.source : null);
  const landingPath = typeof raw.landingPath === "string" && raw.landingPath.startsWith("/")
    ? raw.landingPath.slice(0, 200)
    : null;
  const capturedAt = typeof raw.capturedAt === "string" && Number.isFinite(Date.parse(raw.capturedAt))
    ? new Date(raw.capturedAt).toISOString()
    : null;
  if (!source || !landingPath || !capturedAt) return null;
  return {
    source,
    medium: clean(typeof raw.medium === "string" ? raw.medium : null),
    campaign: clean(typeof raw.campaign === "string" ? raw.campaign : null, 120),
    content: clean(typeof raw.content === "string" ? raw.content : null, 120),
    landingPath,
    referrerHost: clean(typeof raw.referrerHost === "string" ? raw.referrerHost : null, 120),
    capturedAt,
  };
}

export function readStoredSignupAttribution(raw: string | null, now = new Date()): SignupAttributionTouch | null {
  if (!raw) return null;
  try {
    const touch = parseSignupAttributionTouch(JSON.parse(raw));
    if (!touch) return null;
    const age = now.getTime() - Date.parse(touch.capturedAt);
    return age >= 0 && age <= ATTRIBUTION_MAX_AGE_MS ? touch : null;
  } catch {
    return null;
  }
}

export type SignupAttributionSummary = {
  registrations: number;
  trackedRegistrations: number;
  xRegistrations: number;
  xActiveMembers: number;
  xConversionPercent: number | null;
};

export function summarizeSignupAttribution(
  users: Array<{
    createdAt: string;
    activeMember: boolean;
    firstTouch?: SignupAttributionTouch | null;
    lastTouch?: SignupAttributionTouch | null;
  }>,
  days: number,
  now = new Date()
): SignupAttributionSummary {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  const recent = users.filter((user) => {
    const created = Date.parse(user.createdAt);
    return Number.isFinite(created) && created >= cutoff && created <= now.getTime();
  });
  const xUsers = recent.filter((user) => isXAttribution(user.firstTouch) || isXAttribution(user.lastTouch));
  const xActiveMembers = xUsers.filter((user) => user.activeMember).length;
  return {
    registrations: recent.length,
    trackedRegistrations: recent.filter((user) => user.firstTouch || user.lastTouch).length,
    xRegistrations: xUsers.length,
    xActiveMembers,
    xConversionPercent: xUsers.length ? Math.round((xActiveMembers / xUsers.length) * 1000) / 10 : null,
  };
}
