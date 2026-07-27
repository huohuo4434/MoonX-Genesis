/**
 * One-time patch: Altcoin Rotation theme, DOGE/SHIB watchlist, Bitcoin cross-factor.
 * Run: npx tsx scripts/patch-altcoin-rotation-2026-07-26.ts
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { clearMoonXCache, parseMoonXDocument } from "../lib/moonx/load-research";

const lt = (zhCN: string, zhTW: string, en: string) => ({ zhCN, zhTW, en });

const LATEST = path.join(process.cwd(), "content", "moonx", "latest.json");

const dogecoin = {
  id: "dogecoin",
  symbol: "DOGE",
  category: "crypto",
  localizedName: lt("狗狗币", "狗狗幣", "Dogecoin"),
  localizedSummary: lt(
    "山寨币轮动早期龙头观察；分析师所述 0.07384 水平待市场结构验证。",
    "山寨幣輪動早期龍頭觀察；分析師所述 0.07384 水平待市場結構驗證。",
    "Early altcoin-rotation leader watch; analyst-stated 0.07384 level pending market-structure verification."
  ),
  shortView: lt("早期轮动龙头", "早期輪動龍頭", "Early Rotation Leader"),
  status: "Active Watch",
  researchDate: "2026-07-26",
  lastUpdated: "2026-07-26T10:00:00.000Z",
  forecastHorizon: lt("2–6周", "2–6週", "2 to 6 weeks"),
  direction: "bullish",
  confidence: 65,
  scenarioWeights: { base: 60, bull: 25, bear: 15 },
  supportLevels: [],
  resistanceLevels: [],
  targetLevels: [],
  invalidationLevels: [],
  consolidationZones: [],
  turningWindows: [],
  frameworkFactors: [],
  confirmationConditions: [
    lt("来源所述水平经实际市场结构验证", "來源所述水平經實際市場結構驗證", "The source-stated level is verified against actual market structure"),
    lt("价格守住已验证的突破水平", "價格守住已驗證的突破水平", "Price holds above the verified breakout level"),
    lt("回测需求可见", "回測需求可見", "Retest demand is visible"),
    lt("成交量维持 elevated", "成交量維持 elevated", "Trading volume remains elevated"),
    lt("周线动能持续改善", "週線動能持續改善", "Weekly momentum continues improving"),
    lt("更广泛的山寨币市场开始参与", "更廣泛的山寨幣市場開始參與", "The broader altcoin market begins to participate"),
  ],
  riskConditions: [
    lt("突破迅速失败", "突破迅速失敗", "Breakout fails quickly"),
    lt("价格跌破活跃结构且无法收复", "價格跌破活躍結構且無法收復", "Price falls below the active structure and cannot reclaim it"),
    lt("成交量急剧萎缩", "成交量急劇萎縮", "Volume contracts sharply"),
    lt("比特币 dominance 明显上升", "比特幣 dominance 明顯上升", "Bitcoin dominance rises strongly"),
    lt("更广泛 meme 代币行情逆转", "更廣泛 meme 代幣行情逆轉", "The broader meme-token move reverses"),
  ],
  sourceReferences: ["content/moonx/source-notes/2026-07-26-altcoin-rotation.md"],
  verificationStatus: "pending",
  verificationChecklist: [
    lt("DOGE 是否守住已验证的突破结构？", "DOGE 是否守住已驗證的突破結構？", "Did DOGE hold the verified breakout structure?"),
  ],
  trendPath: [
    lt(
      "守住 0.07384 上方将代表突破确认；回测守住则趋势确认更强。",
      "守住 0.07384 上方將代表突破確認；回測守住則趨勢確認更強。",
      "Holding above 0.07384 would represent breakout confirmation; a successful retest would represent stronger trend confirmation."
    ),
    lt(
      "未能守住并收复该水平将削弱来源 thesis。",
      "未能守住並收復該水平將削弱來源 thesis。",
      "Failure to hold and reclaim the level would weaken the source thesis."
    ),
  ],
  themes: [lt("山寨币轮动", "山寨幣輪動", "Altcoin Rotation"), lt("Meme 龙头", "Meme 龍頭", "Meme Leader")],
  relevantFrameworks: ["Altcoin Cycle Rotation"],
  tags: ["dogecoin", "meme", "altcoin-rotation"],
  strategicWatchlistSettings: {
    enabled: true,
    rating: "bullish",
    status: "active",
    statusLabel: lt("活跃观察", "活躍觀察", "Active Watch"),
    currentRole: lt("早期轮动龙头", "早期輪動龍頭", "Early Rotation Leader"),
    sourceLevel: {
      value: 0.07384,
      currency: "USD",
      levelType: lt("分析师所述触发位", "分析師所述觸發位", "Analyst-stated trigger"),
      verificationStatus: "unverified",
    },
    horizon: lt("2–6周", "2–6週", "2 to 6 weeks"),
    mainThemes: [lt("Crypto / Meme Leader", "Crypto / Meme Leader", "Crypto / Meme Leader"), lt("山寨币轮动", "山寨幣輪動", "Altcoin Rotation")],
    thesis: lt(
      "MoonX 将来源结论表述为：守住 0.07384 上方可能代表突破确认；回测守住代表更强趋势确认；未能收复则削弱 thesis。此为研究观察，非保证性判断。",
      "MoonX 將來源結論表述為：守住 0.07384 上方可能代表突破確認；回測守住代表更強趨勢確認；未能收復則削弱 thesis。此為研究觀察，非保證性判斷。",
      "MoonX frames the source conclusion neutrally: holding above 0.07384 may represent breakout confirmation; a successful retest may represent stronger trend confirmation; failure to reclaim would weaken the thesis. This is a research observation, not a guarantee."
    ),
    risks: [
      lt("突破失败或结构失守", "突破失敗或結構失守", "Breakout failure or structure loss"),
      lt("成交量萎缩", "成交量萎縮", "Volume contraction"),
      lt("比特币 dominance 上升", "比特幣 dominance 上升", "Rising Bitcoin dominance"),
    ],
    listingStatus: "n/a",
  },
};

const shibaInu = {
  id: "shiba-inu",
  symbol: "SHIB",
  category: "crypto",
  localizedName: lt("柴犬币", "柴犬幣", "Shiba Inu"),
  localizedSummary: lt(
    "山寨币轮动早期龙头观察；技术位待人工研究更新。",
    "山寨幣輪動早期龍頭觀察；技術位待人工研究更新。",
    "Early altcoin-rotation leader watch; technical levels pending manual research update."
  ),
  shortView: lt("看涨观察", "看漲觀察", "Bullish Watch"),
  status: "Active Watch",
  researchDate: "2026-07-26",
  lastUpdated: "2026-07-26T10:00:00.000Z",
  forecastHorizon: lt("2–6周", "2–6週", "2 to 6 weeks"),
  direction: "watch",
  confidence: 60,
  scenarioWeights: { base: 60, bull: 25, bear: 15 },
  supportLevels: [],
  resistanceLevels: [],
  targetLevels: [],
  invalidationLevels: [],
  consolidationZones: [],
  turningWindows: [],
  frameworkFactors: [],
  confirmationConditions: [
    lt("突破结构保持 intact", "突破結構保持 intact", "Breakout structure remains intact"),
    lt("周线动能改善", "週線動能改善", "Weekly momentum improves"),
    lt("成交量参与扩大", "成交量參與擴大", "Volume participation expands"),
    lt("DOGE 与其他早期龙头继续守住涨幅", "DOGE 與其他早期龍頭繼續守住漲幅", "DOGE and other early leaders continue holding gains"),
    lt("轮动扩散至不止一两个 meme 资产", "輪動擴散至不止一兩個 meme 資產", "Rotation broadens beyond only one or two meme assets"),
  ],
  riskConditions: [
    lt("短暂 spike 后完全 retracement", "短暫 spike 後完全 retracement", "Short-lived spike followed by full retracement"),
    lt("市场 breadth 偏弱", "市場 breadth 偏弱", "Weak market breadth"),
    lt("比特币 breakdown", "比特幣 breakdown", "Bitcoin breakdown"),
    lt("比特币 dominance 快速上升", "比特幣 dominance 快速上升", "Rapid rise in Bitcoin dominance"),
    lt("活跃周线结构丢失", "活躍週線結構丟失", "Loss of the active weekly structure"),
  ],
  sourceReferences: ["content/moonx/source-notes/2026-07-26-altcoin-rotation.md"],
  verificationStatus: "pending",
  verificationChecklist: [
    lt("SHIB 是否守住突破结构？", "SHIB 是否守住突破結構？", "Did SHIB hold its breakout structure?"),
  ],
  trendPath: [
    lt("技术位待人工研究更新。", "技術位待人工研究更新。", "Technical levels pending manual research update."),
  ],
  themes: [lt("山寨币轮动", "山寨幣輪動", "Altcoin Rotation"), lt("Meme 龙头", "Meme 龍頭", "Meme Leader")],
  relevantFrameworks: ["Altcoin Cycle Rotation"],
  tags: ["shib", "meme", "altcoin-rotation"],
  strategicWatchlistSettings: {
    enabled: true,
    rating: "watch",
    ratingLabel: lt("看涨观察", "看漲觀察", "Bullish Watch"),
    status: "active",
    statusLabel: lt("活跃观察", "活躍觀察", "Active Watch"),
    currentRole: lt("早期轮动龙头", "早期輪動龍頭", "Early Rotation Leader"),
    levelsPendingLabel: lt(
      "技术位待人工研究更新",
      "技術位待人工研究更新",
      "Technical levels pending manual research update"
    ),
    horizon: lt("2–6周", "2–6週", "2 to 6 weeks"),
    mainThemes: [lt("Crypto / Meme Leader", "Crypto / Meme Leader", "Crypto / Meme Leader"), lt("山寨币轮动", "山寨幣輪動", "Altcoin Rotation")],
    thesis: lt(
      "作为轮动早期龙头观察对象；未提供具体支撑/阻力/目标价，技术位待后续人工研究录入。",
      "作為輪動早期龍頭觀察對象；未提供具體支撐/阻力/目標價，技術位待後續人工研究錄入。",
      "Tracked as an early rotation leader; no specific support, resistance, or target prices were supplied — technical levels await a future manual research update."
    ),
    risks: [
      lt("短暂 spike 后完全 retracement", "短暫 spike 後完全 retracement", "Short-lived spike followed by full retracement"),
      lt("市场 breadth 不足", "市場 breadth 不足", "Insufficient market breadth"),
    ],
    listingStatus: "n/a",
  },
};

const marketTheme = {
  id: "theme-altcoin-rotation-2026-07-26",
  category: lt("加密市场轮动", "加密市場輪動", "Crypto Market Rotation"),
  localizedTitle: lt("山寨币周期轮动", "山寨幣週期輪動", "Altcoin Cycle Rotation"),
  researchDate: "2026-07-26",
  lastUpdated: "2026-07-26T10:00:00.000Z",
  direction: "bullish",
  currentPhase: "early-leaders",
  rotationPhases: ["dormant", "early-leaders", "broadening", "acceleration", "distribution"],
  status: "Partially Confirmed",
  confidence: 65,
  interpretation: [
    lt(
      "山寨币市场可能已超越短暂 speculative bounce，进入更广泛的轮动阶段。",
      "山寨幣市場可能已超越短暫 speculative bounce，進入更廣泛的輪動階段。",
      "The altcoin market may have moved beyond a brief speculative bounce and entered a broader rotation phase."
    ),
    lt(
      "DOGE 与 SHIB 目前代表早期动能龙头（基于所供研究笔记与用户观察）。",
      "DOGE 與 SHIB 目前代表早期動能龍頭（基於所供研究筆記與用戶觀察）。",
      "DOGE and SHIB currently represent early momentum leaders based on the supplied research notes and user observation."
    ),
    lt(
      "其他显示周线看涨背离的资产可能随后轮动上行。",
      "其他顯示週線看漲背離的資產可能隨後輪動上行。",
      "Other assets showing weekly bullish divergence may begin to rotate upward later."
    ),
    lt(
      "预期路径并非所有山寨币同时上涨，而是早期龙头先行，再选择性扩散至周线结构更强的资产。",
      "預期路徑並非所有山寨幣同時上漲，而是早期龍頭先行，再選擇性擴散至週線結構更強的資產。",
      "The expected path is not that every altcoin rises simultaneously — early leaders first, followed by selective broadening into assets with stronger weekly technical structures."
    ),
    lt(
      "这是轮动 thesis，不保证全面 altcoin season。",
      "這是輪動 thesis，不保證全面 altcoin season。",
      "This is a rotation thesis, not a guarantee of a full-market altcoin season."
    ),
  ],
  frameworkFactors: [
    {
      id: "alt-cycle-rotation",
      framework: "Cycle Rotation Structure",
      directionScore: 70,
      weight: 25,
      confidence: 70,
      explanation: lt(
        "轮动可能代表完整市场段落而非仅短暂 short squeeze。",
        "輪動可能代表完整市場段落而非僅短暫 short squeeze。",
        "The move may represent a complete market segment rather than only a brief short squeeze."
      ),
      status: "Partially Confirmed",
    },
    {
      id: "alt-early-leaders",
      framework: "Early-Leader Confirmation",
      directionScore: 65,
      weight: 25,
      confidence: 70,
      explanation: lt(
        "DOGE 与 SHIB 作为早期龙头提供 partial confirmation。",
        "DOGE 與 SHIB 作為早期龍頭提供 partial confirmation。",
        "DOGE and SHIB as early leaders provide partial confirmation."
      ),
      status: "Partially Confirmed",
    },
    {
      id: "alt-weekly-breadth",
      framework: "Weekly Bullish-Divergence Breadth",
      directionScore: 45,
      weight: 20,
      confidence: 70,
      explanation: lt(
        "更广泛的周线底背离资产尚未批量激活。",
        "更廣泛的週線底背離資產尚未批量激活。",
        "Broader weekly-divergence assets have not yet activated in batch."
      ),
      status: "Waiting",
    },
    {
      id: "alt-btc-eth-liquidity",
      framework: "Bitcoin and Ethereum Liquidity Environment",
      directionScore: 30,
      weight: 15,
      confidence: 70,
      explanation: lt(
        "ETH/BTC 与整体流动性环境仍待确认改善。",
        "ETH/BTC 與整體流動性環境仍待確認改善。",
        "ETH/BTC and the broader liquidity environment still await confirmation of improvement."
      ),
      status: "Waiting",
    },
    {
      id: "alt-market-risk",
      framework: "Market Risk and Sentiment",
      directionScore: 20,
      weight: 15,
      confidence: 70,
      explanation: lt(
        "孤立 meme 强度不足以确认全面 risk-on；需观察 breadth。",
        "孤立 meme 強度不足以確認全面 risk-on；需觀察 breadth。",
        "Isolated meme strength alone is insufficient to confirm full risk-on; breadth must be watched."
      ),
      status: "Active",
    },
  ],
  scenarioWeights: { base: 60, bull: 25, bear: 15 },
  scenarios: {
    base: {
      summary: lt(
        "DOGE/SHIB 保持早期龙头，市场在第一波 move 后整理，轮动逐步扩散。",
        "DOGE/SHIB 保持早期龍頭，市場在第一波 move 後整理，輪動逐步擴散。",
        "DOGE and SHIB remain early leaders; the market consolidates after the first move; rotation gradually broadens."
      ),
      logic: lt(
        "Base case：早期龙头维持，整理后选择性扩散至周线底背离候选，表现高度 uneven。",
        "Base case：早期龍頭維持，整理後選擇性擴散至週線底背離候選，表現高度 uneven。",
        "Base case: early leaders hold, consolidation follows the first move, rotation broadens selectively into weekly-divergence candidates; performance remains highly uneven between tokens."
      ),
    },
    bull: {
      summary: lt(
        "龙头结构守住，ETH/BTC 改善，dominance 停止上升，breadth 扩大。",
        "龍頭結構守住，ETH/BTC 改善，dominance 停止上升，breadth 擴大。",
        "Leader structures hold; ETH/BTC improves; dominance weakens or stops rising; breadth expands."
      ),
      logic: lt(
        "Bull case：更多周线底背离资产开始 sustained advance。",
        "Bull case：更多週線底背離資產開始 sustained advance。",
        "Bull case: more weekly-divergence assets begin sustained advances."
      ),
    },
    bear: {
      summary: lt(
        "Meme move 仅为 short squeeze，龙头 fully retrace，dominance 上升，alt 参与失败。",
        "Meme move 僅為 short squeeze，龍頭 fully retrace，dominance 上升，alt 參與失敗。",
        "The meme move becomes only a short squeeze; leaders fully retrace; dominance rises; broader alt participation fails."
      ),
      logic: lt(
        "Bear case：比特币失去 major support，轮动 thesis 失效。",
        "Bear case：比特幣失去 major support，輪動 thesis 失效。",
        "Bear case: Bitcoin loses major support and the rotation thesis fails."
      ),
    },
  },
  verificationChecklist: [
    lt("DOGE 是否守住已验证的突破结构？", "DOGE 是否守住已驗證的突破結構？", "Did DOGE hold the verified breakout structure?"),
    lt("SHIB 是否守住突破结构？", "SHIB 是否守住突破結構？", "Did SHIB hold its breakout structure?"),
    lt("是否有额外周线底背离资产激活？", "是否有額外週線底背離資產激活？", "Did additional weekly-divergence assets activate?"),
    lt("山寨币成交量是否扩大？", "山寨幣成交量是否擴大？", "Did altcoin trading volume broaden?"),
    lt("市场 breadth 是否改善？", "市場 breadth 是否改善？", "Did market breadth improve?"),
    lt("ETH/BTC 是否走强？", "ETH/BTC 是否走強？", "Did ETH/BTC strengthen?"),
    lt("比特币 dominance 是否走弱或企稳？", "比特幣 dominance 是否走弱或企穩？", "Did Bitcoin dominance weaken or stabilize?"),
    lt("行情是否持续超过短暂 speculative spike？", "行情是否持續超過短暫 speculative spike？", "Did the move last longer than a brief speculative spike?"),
    lt("市场是否从 Early Leaders 进入 Broadening？", "市場是否從 Early Leaders 進入 Broadening？", "Did the market progress from Early Leaders to Broadening?"),
  ],
  riskConditions: [
    lt("孤立 meme 强度被误判为全面 alt season", "孤立 meme 強度被誤判為全面 alt season", "Isolated meme strength misread as a full alt season"),
    lt("Bitcoin dominance 快速上升", "Bitcoin dominance 快速上升", "Bitcoin dominance rises sharply"),
    lt("成交量无法 sustained", "成交量無法 sustained", "Volume fails to sustain"),
  ],
  weeklyDivergenceCandidates: [
    {
      assetId: "dogecoin",
      symbol: "DOGE",
      localizedName: lt("狗狗币", "狗狗幣", "Dogecoin"),
      weeklyDivergenceStatus: lt("龙头已激活", "龍頭已激活", "Leader already activated"),
      activationStatus: lt("已激活", "已激活", "Activated"),
      currentRole: lt("早期轮动龙头", "早期輪動龍頭", "Early Rotation Leader"),
      confirmationConditions: [
        lt("突破结构保持", "突破結構保持", "Breakout structure holds"),
        lt("成交量 elevated", "成交量 elevated", "Volume remains elevated"),
      ],
      invalidationConditions: [lt("结构失守", "結構失守", "Structure fails")],
      lastUpdated: "2026-07-26",
    },
    {
      assetId: "shiba-inu",
      symbol: "SHIB",
      localizedName: lt("柴犬币", "柴犬幣", "Shiba Inu"),
      weeklyDivergenceStatus: lt("龙头已激活", "龍頭已激活", "Leader already activated"),
      activationStatus: lt("已激活", "已激活", "Activated"),
      currentRole: lt("早期轮动龙头", "早期輪動龍頭", "Early Rotation Leader"),
      confirmationConditions: [lt("周线动能改善", "週線動能改善", "Weekly momentum improves")],
      invalidationConditions: [lt("完全 retracement", "完全 retracement", "Full retracement")],
      lastUpdated: "2026-07-26",
    },
  ],
  sourceNotes: [
    {
      id: "altcoin-note-doge-technical",
      sourceType: lt("分析师技术结论", "分析師技術結論", "Analyst Technical Conclusion"),
      sourceDate: "2026-07-26",
      asset: "DOGE",
      summary: lt(
        "来源所述关键水平 0.07384 — 待市场验证。守住代表突破确认；回测守住代表更强确认；未能收复则削弱 thesis。",
        "來源所述關鍵水平 0.07384 — 待市場驗證。守住代表突破確認；回測守住代表更強確認；未能收復則削弱 thesis。",
        "Source-stated key level 0.07384 — pending market verification. Holding above may confirm breakout; retest hold may confirm trend; failure to reclaim weakens the thesis."
      ),
      logic: [
        lt("守住 0.07384 上方：突破确认", "守住 0.07384 上方：突破確認", "Holding above 0.07384: breakout confirmation"),
        lt("回测守住：更强趋势确认", "回測守住：更強趨勢確認", "Retest holds: stronger trend confirmation"),
        lt("未能收复：削弱来源 thesis", "未能收復：削弱來源 thesis", "Failure to reclaim: weakens source thesis"),
      ],
    },
    {
      id: "altcoin-note-cycle-rotation",
      sourceType: lt("周期轮动分析", "週期輪動分析", "Cycle Rotation Analysis"),
      sourceDate: "2026-07-26",
      summary: lt(
        "山寨币 move 可能代表完整市场段落；早期布局通常优于 rapid acceleration 后追涨；分析师未披露具体标的 — MoonX 视为板块级 cycle 证据。",
        "山寨幣 move 可能代表完整市場段落；早期布局通常優於 rapid acceleration 後追漲；分析師未披露具體標的 — MoonX 視為板塊級 cycle 證據。",
        "The altcoin move may represent a complete segment; earlier positioning generally has better risk-reward than chasing after rapid acceleration; the analyst did not disclose specific assets — MoonX treats this as sector-level cycle evidence."
      ),
      logic: [],
    },
  ],
  earlyLeaderSymbols: ["DOGE", "SHIB"],
  linkedWatchlistAssetIds: ["dogecoin", "shiba-inu"],
};

function patchBitcoinFactors(doc: Record<string, unknown>) {
  const assets = doc.assets as Array<Record<string, unknown>>;
  const bitcoin = assets.find((a) => a.id === "bitcoin");
  if (!bitcoin) throw new Error("bitcoin asset not found");
  const factors = bitcoin.frameworkFactors as Array<Record<string, unknown>>;
  const marketRisk = factors.find((f) => f.id === "btc-market-risk");
  if (marketRisk) marketRisk.weight = 5;
  factors.push({
    id: "btc-altcoin-risk-appetite",
    framework: "Altcoin Risk Appetite",
    directionScore: 35,
    weight: 5,
    confidence: 65,
    explanation: lt(
      "DOGE/SHIB 早期强度或暗示 speculative risk appetite 改善；需 broader 参与确认；孤立 meme 强度不足以确认全面流动性 cycle。",
      "DOGE/SHIB 早期強度或暗示 speculative risk appetite 改善；需 broader 參與確認；孤立 meme 強度不足以確認全面流動性 cycle。",
      "Early DOGE and SHIB strength may indicate improving speculative risk appetite; broad participation would provide stronger confirmation; isolated meme-token strength alone is insufficient to confirm a full liquidity cycle."
    ),
    status: "Waiting",
  });
}

function main() {
  const doc = JSON.parse(readFileSync(LATEST, "utf8")) as Record<string, unknown>;
  doc.version = "2026-07-26-v2";
  doc.snapshotId = "2026-07-26-v2";
  doc.lastUpdated = "2026-07-26T10:00:00.000Z";

  const assets = doc.assets as Array<Record<string, unknown>>;
  if (assets.some((a) => a.id === "dogecoin" || a.id === "shiba-inu")) {
    throw new Error("dogecoin or shiba-inu already exists — aborting to avoid duplicates");
  }
  assets.push(dogecoin, shibaInu);

  doc.marketThemes = [marketTheme];
  patchBitcoinFactors(doc);

  const parsed = parseMoonXDocument(doc);
  if (!parsed.ok) {
    console.error(parsed.error.issues);
    process.exit(1);
  }

  writeFileSync(LATEST, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  clearMoonXCache();
  console.log("Patched content/moonx/latest.json → version 2026-07-26-v2");
}

main();
