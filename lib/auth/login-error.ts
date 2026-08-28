export type LoginAuthFailure = {
  status: 401 | 429 | 503;
  error: string;
  code: "INVALID_CREDENTIALS" | "EMAIL_NOT_CONFIRMED" | "RATE_LIMITED" | "AUTH_PROVIDER_UNAVAILABLE";
};

type AuthErrorLike = {
  message?: unknown;
  status?: unknown;
  code?: unknown;
  name?: unknown;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function classifyLoginAuthError(error: unknown): LoginAuthFailure {
  const candidate = error && typeof error === "object" ? (error as AuthErrorLike) : null;
  const message = asNonEmptyString(candidate?.message) ?? asNonEmptyString(error);

  if (message && /email not confirmed/i.test(message)) {
    return { status: 401, error: "Email not confirmed", code: "EMAIL_NOT_CONFIRMED" };
  }

  if (message && /invalid login credentials|invalid.*password|user not found|no user found/i.test(message)) {
    return { status: 401, error: "Invalid login credentials", code: "INVALID_CREDENTIALS" };
  }

  if (message && /rate|too many|frequent/i.test(message)) {
    return { status: 429, error: "请求过于频繁，请稍后再试", code: "RATE_LIMITED" };
  }

  return {
    status: 503,
    error: "登录服务繁忙，请稍后再试",
    code: "AUTH_PROVIDER_UNAVAILABLE",
  };
}

export function safeLoginAuthErrorMeta(error: unknown): Record<string, string | number | null> {
  const candidate = error && typeof error === "object" ? (error as AuthErrorLike) : null;
  return {
    name: asNonEmptyString(candidate?.name),
    code: asNonEmptyString(candidate?.code),
    status: typeof candidate?.status === "number" ? candidate.status : null,
  };
}
