export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;

export const PASSWORD_RESET_GENERIC_MESSAGE =
  "如果该邮箱已注册，我们会发送一封重设密码邮件。请检查收件箱和垃圾邮件。";

export function normalizePasswordResetEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `新密码至少需要 ${PASSWORD_MIN_LENGTH} 位。`;
  if (password.length > PASSWORD_MAX_LENGTH) return "新密码过长，请使用不超过 200 位的密码。";
  if (password !== confirmation) return "两次输入的新密码不一致。";
  return null;
}

export function buildPasswordResetCallbackUrl(siteUrl: string): string {
  const callback = new URL("/auth/callback", siteUrl);
  callback.searchParams.set("next", "/reset-password");
  return callback.toString();
}
