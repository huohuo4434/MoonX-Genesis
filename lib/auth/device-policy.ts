/**
 * Pure policy helpers for paid-member device binding and concurrent-content access.
 * No browser fingerprinting, raw IP storage, or database access is used here.
 */
export const MAX_MEMBER_DEVICES = 2;
export const MEMBER_LEASE_SECONDS = 120;

export function canBindTrustedDevice(input: {
  activeDeviceCount: number;
  isAdmin: boolean;
}): boolean {
  return input.isAdmin || input.activeDeviceCount < MAX_MEMBER_DEVICES;
}

export type LeasePolicyDecision = "ACQUIRE" | "REFRESH" | "FORCE_SWITCH" | "BLOCK";

export function decideMemberLease(input: {
  leaseDeviceIdHash?: string | null;
  leaseExpiresAtMs?: number | null;
  currentDeviceIdHash: string;
  nowMs: number;
  forceAcquire?: boolean;
}): LeasePolicyDecision {
  if (!input.leaseDeviceIdHash || !input.leaseExpiresAtMs) return "ACQUIRE";
  if (input.leaseDeviceIdHash === input.currentDeviceIdHash) return "REFRESH";
  if (input.forceAcquire) return "FORCE_SWITCH";
  if (input.leaseExpiresAtMs <= input.nowMs) return "ACQUIRE";
  return "BLOCK";
}
