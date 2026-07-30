/**
 * Production route audit crawler.
 * Usage: npx tsx scripts/audit-routes.ts [baseUrl]
 */
import { AUDIT_ROUTES, INTERNAL_LEGACY_ROUTES } from "../config/navigation";

const BASE = process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || "https://moon-x-genesis.vercel.app";

type Row = {
  path: string;
  status: number;
  title: string;
  leaked: boolean;
  note: string;
};

const LEAK_MARKERS = [
  "2026至2035",
  "2035",
  "长期目标",
  "年度六爻",
  "sourceIds",
  "forecastChart",
  "六爻原始",
];

async function check(path: string): Promise<Row> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  try {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": "MoonX-Audit/1.0", Accept: "text/html" },
      signal: AbortSignal.timeout(25000),
    });
    const status = res.status;
    let title = "";
    let body = "";
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("text/html") || ct.includes("json")) {
      body = await res.text();
      const m = body.match(/<title[^>]*>([^<]*)<\/title>/i);
      title = m?.[1]?.trim() ?? "";
    }
    const isLegacy = INTERNAL_LEGACY_ROUTES.some((r) => path === r || path.startsWith(`${r}/`));
    const leaked =
      !isLegacy &&
      status === 200 &&
      LEAK_MARKERS.some((k) => body.includes(k) && !path.startsWith("/admin"));
    let note = "";
    if (isLegacy && status !== 404 && status !== 307 && status !== 308) {
      note = "legacy route should be 404 for anonymous";
    }
    if ([301, 302, 303, 307, 308].includes(status)) {
      note = `redirect → ${res.headers.get("location") ?? ""}`;
    }
    return { path, status, title, leaked, note };
  } catch (err) {
    return {
      path,
      status: 0,
      title: "",
      leaked: false,
      note: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const rows: Row[] = [];
  for (const path of AUDIT_ROUTES) {
    rows.push(await check(path));
  }
  const legacyFail = rows.filter(
    (r) =>
      INTERNAL_LEGACY_ROUTES.some((x) => r.path === x) &&
      r.status !== 404 &&
      r.status !== 0
  );
  const dead = rows.filter((r) => r.status === 0 || r.status >= 500);
  const leaks = rows.filter((r) => r.leaked);
  console.log(
    JSON.stringify(
      {
        base: BASE,
        checked: rows.length,
        deadLinks: dead.length,
        legacyNot404: legacyFail.length,
        publicLeaks: leaks.length,
        rows,
      },
      null,
      2
    )
  );
  if (legacyFail.length || leaks.length || dead.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
