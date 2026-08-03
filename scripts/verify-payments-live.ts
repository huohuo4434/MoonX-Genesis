async function main() {
  const pricing = await fetch("https://moon-x-genesis.vercel.app/pricing", { cache: "no-store" });
  const pt = await pricing.text();
  const health = await (
    await fetch("https://moon-x-genesis.vercel.app/api/health/payment-orders", { cache: "no-store" })
  ).json();
  console.log(
    JSON.stringify(
      {
        pricingStatus: pricing.status,
        has80: pt.includes("80 USDT"),
        has200: pt.includes("200"),
        has700: pt.includes("700"),
        hasClosedBeta:
          pt.includes("封闭内测") || pt.includes("支付功能尚未开放") || pt.includes("30 USDT／"),
        health,
      },
      null,
      2
    )
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
