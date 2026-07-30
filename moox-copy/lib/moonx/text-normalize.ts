/** Normalize timeline / snapshot Chinese copy for display. */
export function normalizeZhCopy(text: string): string {
  return text
    .replace(/待验证的\s+投机性\s+上市观察窗口/g, "投机性上市观察窗口（待验证）")
    .replace(/鹰派\s+表态/g, "鹰派表态")
    .replace(/85,000基准\s*\/\s*90,000\s*看涨情景/g, "85,000美元基准情景／90,000美元乐观情景")
    .replace(/85,000可达\s*\/\s*90,000\s*可能目标/g, "85,000美元基准情景／90,000美元乐观情景")
    .replace(/A股4,500情景目标/g, "上证指数4,500点情景目标")
    .replace(/半导体疲软\/修复转折点/g, "半导体由弱转强观察窗口")
    .replace(/Draft\s*—\s*Pending Verification/gi, "草稿｜待验证")
    .replace(/草稿\s*—\s*待验证/g, "草稿｜待验证");
}
