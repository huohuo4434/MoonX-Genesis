export interface RuntimeLeaseStore {
  tryAcquire(owner: string, leaseSeconds: number): Promise<boolean>;
  release(owner: string): Promise<boolean>;
}

function requireOwner(owner: string): string {
  const normalized = owner.trim();
  if (!normalized) throw new Error("Runtime lease owner is required");
  return normalized;
}

export function acquireRuntimeLease(
  store: RuntimeLeaseStore,
  owner: string,
  leaseSeconds: number
): Promise<boolean> {
  const duration = Math.floor(leaseSeconds);
  if (!Number.isFinite(duration) || duration < 1) {
    throw new Error("Runtime lease duration must be positive");
  }
  return store.tryAcquire(requireOwner(owner), duration);
}

export function releaseRuntimeLease(
  store: RuntimeLeaseStore,
  owner: string
): Promise<boolean> {
  return store.release(requireOwner(owner));
}
