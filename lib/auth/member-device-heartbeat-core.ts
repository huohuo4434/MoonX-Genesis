export function isCurrentHeartbeatGeneration(input: {
  responseGeneration: number;
  latestGeneration: number;
  cancelled: boolean;
}): boolean {
  return !input.cancelled && input.responseGeneration === input.latestGeneration;
}
