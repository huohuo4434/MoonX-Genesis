import "server-only";

/** Email notifications — SMTP not configured yet. Never pretend emails were sent. */

export type EmailTemplate =
  | "login_magic_link"
  | "order_created"
  | "payment_confirmed"
  | "membership_activated"
  | "membership_expiring"
  | "payment_manual_review";

export async function sendMoonXEmail(input: {
  to: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
}): Promise<{ sent: false; reason: string }> {
  void input;
  // Supabase Auth handles magic link emails when configured in Supabase dashboard.
  // Transactional emails require SMTP — not configured on MoonX yet.
  return { sent: false, reason: "邮件服务待配置（SMTP 未接入）" };
}
