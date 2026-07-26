import { useEffect, useState } from "react";

/**
 * Returns `true` once the component has mounted on the client. Useful for
 * guarding browser-only APIs and avoiding SSR/client markup mismatches.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
