export function startMemberDeskPolling<T>(input: {
  read: (signal: AbortSignal) => Promise<T>;
  onSnapshot: (snapshot: T) => void;
  onError: (error: unknown) => void;
  intervalMs: number;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
}): () => void {
  let active = true;
  let generation = 0;
  let controller: AbortController | null = null;
  const refresh = () => {
    controller?.abort();
    controller = new AbortController();
    const currentGeneration = ++generation;
    void input.read(controller.signal).then(
      (snapshot) => {
        if (active && currentGeneration === generation) input.onSnapshot(snapshot);
      },
      (error) => {
        if (!active || currentGeneration !== generation || (error instanceof DOMException && error.name === "AbortError")) return;
        input.onError(error);
      }
    );
  };
  refresh();
  const timer = (input.setIntervalFn ?? setInterval)(refresh, input.intervalMs);
  return () => {
    active = false;
    generation += 1;
    controller?.abort();
    (input.clearIntervalFn ?? clearInterval)(timer);
  };
}

export function memberDeskRefreshPresentation(error: string, en: boolean): {
  stale: boolean;
  statusLabel: string | null;
  serverLabel: string | null;
} {
  if (!error) return { stale: false, statusLabel: null, serverLabel: null };
  return {
    stale: true,
    statusLabel: en ? "REFRESH FAILED · LAST SNAPSHOT" : "刷新失败 · 上次成功快照",
    serverLabel: en
      ? "refresh failed; showing last successful snapshot"
      : "刷新失败；当前显示上次成功快照",
  };
}
