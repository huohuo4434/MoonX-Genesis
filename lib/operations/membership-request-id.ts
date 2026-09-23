/** Stable across a lost response, refresh and browser restart for the same reviewed operation. */
export async function membershipRequestId(userId: string, action: string, reason: string): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(["membership-adjustment-v1", userId, action, reason.trim()]));
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const hex = Array.from(hash.slice(0, 16), value => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
