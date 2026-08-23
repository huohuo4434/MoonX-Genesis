/** Deterministic Beijing-time rendering shared by SSR and the browser. */
export function formatBeijingDeskTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const beijing = new Date(date.getTime() + 8 * 60 * 60_000);
  const two = (part: number) => String(part).padStart(2, "0");
  return `${two(beijing.getUTCMonth() + 1)}/${two(beijing.getUTCDate())} ${two(beijing.getUTCHours())}:${two(beijing.getUTCMinutes())}`;
}
