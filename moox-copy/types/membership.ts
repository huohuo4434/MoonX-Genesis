/** Membership & payment domain types (Supabase-backed). */

export type ProfileRole = "user" | "member" | "premium" | "admin";
export type MembershipStatus = "inactive" | "active" | "expired" | "suspended";
export type PaymentChain = "TRON" | "BSC";
export type OrderStatus =
  | "pending"
  | "verifying"
  | "paid"
  | "underpaid"
  | "overpaid"
  | "expired"
  | "manual_review"
  | "rejected"
  | "refunded";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: ProfileRole;
  membership_status: MembershipStatus;
  membership_started_at: string | null;
  membership_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipPlan {
  id: string;
  code: string;
  name: string;
  duration_days: number;
  price_usdt: number | null;
  access_level: "member" | "premium";
  active: boolean;
  sort_order: number;
}

export interface PaymentOrder {
  id: string;
  order_number: string;
  user_id: string;
  plan_id: string;
  chain: PaymentChain;
  token_symbol: string;
  token_contract: string;
  recipient_address: string;
  expected_amount: number;
  paid_amount: number | null;
  status: OrderStatus;
  tx_hash: string | null;
  created_at: string;
  expires_at: string;
  paid_at: string | null;
  verified_at: string | null;
  membership_expires_at: string | null;
  verification_error: string | null;
  metadata: Record<string, unknown>;
}

export interface VerifiedTransfer {
  chain: PaymentChain;
  txHash: string;
  blockNumber: number | null;
  senderAddress: string;
  recipientAddress: string;
  tokenContract: string;
  amountRaw: string;
  amountNormalized: number;
  blockTimestamp: Date;
  rawPayload: Record<string, unknown>;
}
