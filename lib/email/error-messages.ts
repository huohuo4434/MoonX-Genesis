export function chineseResendError(raw?: string): string {
  if (!raw?.trim()) return "邮件发送失败：Resend 未返回具体原因";
  const message = raw.toLowerCase();
  if (message.includes("缺少 resend_api_key") || message.includes("邮件服务未配置：缺少")) {
    return "邮件服务未配置：缺少 RESEND_API_KEY";
  }
  if (message.includes("restricted") || message.includes("only send testing emails") || message.includes("own email")) {
    return "Resend仍处于测试发件模式；请先验证mooxintel.com发件域名，再点击“重新发送解答邮件”。";
  }
  if (message.includes("invalid api key") || message.includes("unauthorized") || message.includes("401")) {
    return "Resend API密钥无效，请更新生产环境密钥。";
  }
  if (message.includes("not verified") || message.includes("domain is not verified") || message.includes("from address") || message.includes("validation_error") || (message.includes("from") && message.includes("domain"))) {
    return "发件域名尚未通过Resend验证；请验证mooxintel.com并使用该域名的发件地址。";
  }
  if (message.includes("bounce") || message.includes("blocked") || message.includes("recipient")) {
    return "收件人地址被邮件服务拒绝，请核对会员邮箱。";
  }
  if (message.includes("rate") || message.includes("too many") || message.includes("429")) {
    return "邮件发送频率受限，请稍后重新发送。";
  }
  if (message.includes("quota") || message.includes("billing") || message.includes("payment")) {
    return "Resend账户额度或计费状态异常。";
  }
  return "邮件发送失败，未返回可公开的错误分类；请稍后重试或检查Resend后台。";
}
