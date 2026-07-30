async function main() {
  const urls = [
    "https://moon-x-genesis.vercel.app/member/stocks",
    "https://moon-x-genesis.vercel.app/member/stocks/688825",
    "https://moon-x-genesis.vercel.app/api/member/stocks/688825",
    "https://moon-x-genesis.vercel.app/pricing",
    "https://moon-x-genesis.vercel.app/",
  ];
  for (const u of urls) {
    const r = await fetch(u, { cache: "no-store" });
    const t = await r.text();
    let j: Record<string, unknown> | null = null;
    if (u.includes("/api/")) {
      try {
        j = JSON.parse(t) as Record<string, unknown>;
      } catch {
        j = null;
      }
    }
    console.log(
      JSON.stringify({
        u,
        status: r.status,
        hasChangxin: t.includes("长鑫科技"),
        has688825: t.includes("688825"),
        hasBenefit: t.includes("会员福利股"),
        hasExpectedPath: t.includes("expectedPath"),
        hasKeySupport: t.includes("keySupport"),
        hasDirectionField: t.includes('"direction"'),
        hasLocked: t.includes("会员锁定") || t.includes("购买会员") || Boolean(j?.locked),
        apiMode: j?.mode ?? null,
        apiKeys: j ? Object.keys(j) : null,
      })
    );
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
