export type Tp1ProtectionRef = { orderId: string };
export type Tp1RemainingPosition = { total: number };

export type Tp1ProtectionTransitionResult =
  | { state: "PROTECTED"; protectionOrderId: string }
  | { state: "POSITION_CLOSED" }
  | { state: "EMERGENCY_CLOSE_SUBMITTED" }
  | { state: "RECOVERY_UNCONFIRMED"; error: string };

export function shouldRunTp1ProtectionTransition(input: {
  tp1Done: boolean;
  targetReached: boolean;
}): boolean {
  return !input.tp1Done && input.targetReached;
}

export async function runTp1ProtectionTransition(input: {
  reducePosition: () => Promise<void>;
  persistPartialClose: () => Promise<void>;
  cancelExistingProtection: () => Promise<void>;
  readProtection: () => Promise<Tp1ProtectionRef | null>;
  readRemainingPosition: () => Promise<Tp1RemainingPosition | null>;
  placeReplacementProtection: () => Promise<Tp1ProtectionRef>;
  persistProtection: (protection: Tp1ProtectionRef) => Promise<void>;
  emergencyCloseRemaining: (position: Tp1RemainingPosition) => Promise<void>;
  persistEmergencyClose: () => Promise<void>;
}): Promise<Tp1ProtectionTransitionResult> {
  // The confirmed partial close is persisted before touching the old protection.
  // If the process crashes after the exchange write, the stable close outbox key
  // recovers the same order; it cannot submit a second reduction.
  await input.reducePosition();
  await input.persistPartialClose();

  let cancelFailed = false;
  try {
    await input.cancelExistingProtection();
  } catch {
    cancelFailed = true;
  }

  try {
    const existing = await input.readProtection();
    if (existing) {
      // A failed/ambiguous cancellation or eventual-consistency response leaves
      // a real exchange-side protection. Keep it; never create a possible duplicate.
      await input.persistProtection(existing);
      return { state: "PROTECTED", protectionOrderId: existing.orderId };
    }

    try {
      const replacement = await input.placeReplacementProtection();
      await input.persistProtection(replacement);
      return { state: "PROTECTED", protectionOrderId: replacement.orderId };
    } catch {
      // PLACE_PROTECTION can fail after a remote write. Re-read authority first,
      // then retry only through the same stable outbox key.
      const recovered = await input.readProtection();
      if (recovered) {
        await input.persistProtection(recovered);
        return { state: "PROTECTED", protectionOrderId: recovered.orderId };
      }
      const remaining = await input.readRemainingPosition();
      if (!remaining || remaining.total <= 0) return { state: "POSITION_CLOSED" };
      try {
        const retried = await input.placeReplacementProtection();
        await input.persistProtection(retried);
        return { state: "PROTECTED", protectionOrderId: retried.orderId };
      } catch {
        const finalProtection = await input.readProtection();
        if (finalProtection) {
          await input.persistProtection(finalProtection);
          return { state: "PROTECTED", protectionOrderId: finalProtection.orderId };
        }
        const finalPosition = await input.readRemainingPosition();
        if (!finalPosition || finalPosition.total <= 0) return { state: "POSITION_CLOSED" };
        await input.emergencyCloseRemaining(finalPosition);
        await input.persistEmergencyClose();
        return { state: "EMERGENCY_CLOSE_SUBMITTED" };
      }
    }
  } catch (error) {
    return {
      state: "RECOVERY_UNCONFIRMED",
      error: `${cancelFailed ? "cancel-unconfirmed; " : ""}${error instanceof Error ? error.message : "TP1 protection recovery failed"}`,
    };
  }
}
