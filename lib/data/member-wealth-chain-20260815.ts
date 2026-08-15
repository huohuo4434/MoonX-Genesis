import "server-only";

import { projectWealthChainForMember, validateWealthChainArchive } from "@/lib/data/member-wealth-chain-core";
import type { MemberWealthChainPack, MemberWealthChainView } from "@/types/member-wealth-chain";

const pack: MemberWealthChainPack = {
  schemaVersion: "2026-08-15.v1",
  ingestedAt: "2026-08-15",
  title: { zh: "财富链：产业、资金与估值联动", en: "Wealth Chain: Industry, Capital and Valuation" },
  description: {
    zh: "易老师把产业景气、资本开支、现金流、宏观利率、资金轮动与技术结构放进同一条观察链，形成可以持续验证的市场研究框架。",
    en: "Yi connects industry demand, capital expenditure, cash flow, rates, capital rotation and technical structure into one continuously testable research framework.",
  },
  archiveNotice: {
    zh: "首批档案依据 8 份已转写视频建立。后续新视频按视频标识与内容哈希追加；旧版本、旧判断和失败样本不会被覆盖。",
    en: "The first archive is based on eight transcribed videos. Future videos are appended by video identity and content hash; prior versions, calls and failed samples are never overwritten.",
  },
  executionAuthority: "RESEARCH_ONLY",
  consensusEligible: false,
  tradingEligible: false,
  episodeCount: 8,
  episodes: [
    {
      id: "wealth-avgo-asic-cycle-v1",
      sourceVideoId: "eAizM_rSLqs",
      sourceContentSha256: "F27997D645CFB2F519095DEA7AD2E84C9B3214CDCD24C100DCD77CDD94550CB0",
      sourceTranscriptFile: "AI投資者必看！這支股票，即將大爆發？！【D的財富鏈⧸美股】 [eAizM_rSLqs].zh.vtt",
      sourcePublishedAt: null,
      verificationStatus: "TRANSCRIPT_IMPORTED_RESEARCH_PENDING",
      topics: ["AI_INFRASTRUCTURE", "CAPITAL_CYCLE", "VALUATION"],
      assets: ["AVGO", "NVDA", "TSM", "GOOGL", "AMZN", "MSFT"],
      horizon: { zh: "未来 2—3 年产业趋势；估值按季度复核", en: "Two-to-three-year industry trend; quarterly valuation review" },
      title: { zh: "ASIC 扩张链：增长很强，但客户集中与预期透支必须同时看", en: "ASIC expansion: strong growth with concentration and expectation risk" },
      thesis: {
        zh: "定制芯片与网络互联可能成为 AI 基础设施的下一段增长，但好公司不等于任何价格都值得追。核心矛盾是云厂商资本开支持续性、少数大客户集中度与高估值之间的平衡。",
        en: "Custom silicon and networking may drive the next AI-infrastructure leg, but a strong company is not attractive at every price. The key balance is hyperscaler capex durability, customer concentration and valuation.",
      },
      evidenceToWatch: [
        { zh: "AI 半导体收入增速、订单能见度与下一财年指引", en: "AI semiconductor growth, backlog visibility and next-year guidance" },
        { zh: "前五大客户收入占比及云厂商资本开支变化", en: "Top-five customer concentration and hyperscaler capex changes" },
        { zh: "财报后估值是否已经提前计入下一轮增长", en: "Whether post-earnings valuation already discounts the next growth leg" },
      ],
      confirmationSignals: [
        { zh: "主要客户继续上调 AI 资本开支，且订单/收入指引同步上修", en: "Major customers raise AI capex while orders and revenue guidance rise" },
        { zh: "增长兑现后自由现金流和利润率没有明显恶化", en: "Free cash flow and margins hold as growth is delivered" },
      ],
      invalidationSignals: [
        { zh: "客户下调定制芯片采购或延后部署", en: "Customers cut custom-silicon purchases or delay deployments" },
        { zh: "高估值维持但业绩指引不再上修", en: "Valuation stays elevated while guidance stops improving" },
      ],
      portfolioUse: { zh: "用于 AI 基础设施景气度观察，不构成追高或自动开仓信号。", en: "Used to monitor AI-infrastructure demand, not as a chase or automated-entry signal." },
    },
    {
      id: "wealth-googl-capex-v1",
      sourceVideoId: "xLgGbGP9oSY",
      sourceContentSha256: "265B02E66AA61E59F043CE8E0236412091E7EB0F860A50117F054A34C37549D4",
      sourceTranscriptFile: "AI遊戲，正在失控！谷歌這份財報，如何決定美股生死？！【D的財富鏈⧸GOOG分析】 [xLgGbGP9oSY].zh.vtt",
      sourcePublishedAt: null,
      verificationStatus: "TRANSCRIPT_IMPORTED_RESEARCH_PENDING",
      topics: ["AI_INFRASTRUCTURE", "CAPITAL_CYCLE", "VALUATION"],
      assets: ["GOOGL", "NVDA", "TSM", "AVGO", "MU", "AMZN", "MSFT", "META"],
      horizon: { zh: "未来 4—8 个季度", en: "Next four to eight quarters" },
      title: { zh: "云收入与资本开支竞赛：收入加速不代表现金流压力消失", en: "Cloud growth versus capex: accelerating revenue does not remove cash-flow pressure" },
      thesis: {
        zh: "AI 已开始推动云业务与搜索生态增长，但资本开支、折旧、债务融资和股本融资也在加速。对整条 AI 链最重要的不是单季收入，而是新增投入能否持续产生高于资本成本的回报。",
        en: "AI is supporting cloud and search growth, while capex, depreciation, debt and equity financing also accelerate. The chain ultimately depends on whether incremental investment earns above its cost of capital.",
      },
      evidenceToWatch: [
        { zh: "云业务收入、利润率、积压订单与 AI 使用量", en: "Cloud revenue, margins, backlog and AI usage" },
        { zh: "经营现金流减资本开支、折旧增速与融资结构", en: "Operating cash flow less capex, depreciation growth and funding mix" },
        { zh: "微软、亚马逊、Meta 同期资本开支是否形成共振", en: "Whether Microsoft, Amazon and Meta capex confirm the same trend" },
      ],
      confirmationSignals: [
        { zh: "云收入和利润增速持续跑赢折旧与融资成本", en: "Cloud revenue and profit outgrow depreciation and financing costs" },
        { zh: "多家云厂商同时确认订单与变现能力", en: "Multiple cloud vendors confirm both orders and monetization" },
      ],
      invalidationSignals: [
        { zh: "资本开支继续上升但云增速、利润率或积压订单转弱", en: "Capex rises while cloud growth, margins or backlog weaken" },
        { zh: "自由现金流持续为负且依赖外部融资扩大", en: "Free cash flow stays negative while external financing expands" },
      ],
      portfolioUse: { zh: "用于判断 AI 产业链总需求是否仍可持续；必须与估值和技术结构共同复核。", en: "Used to assess AI-chain demand durability, together with valuation and technical structure." },
    },
    {
      id: "wealth-us-rotation-v1",
      sourceVideoId: "22DYoN3ID14",
      sourceContentSha256: "EF328E6131DB322D260A9EFEA1EECE2C1B1D5C04C01BE6F048F2FD1A100194A3",
      sourceTranscriptFile: "華爾街新動作！美股正在大轉型！跟上節奏！才是2026下半年投資賺錢關鍵！【D的財富鏈】 [22DYoN3ID14].zh.vtt",
      sourcePublishedAt: null,
      verificationStatus: "TRANSCRIPT_IMPORTED_RESEARCH_PENDING",
      topics: ["SECTOR_ROTATION", "CAPITAL_CYCLE", "VALUATION"],
      assets: ["SPY", "QQQ", "IWM", "SOXX", "XLV"],
      horizon: { zh: "未来一个财报季到两个季度", en: "One earnings season to two quarters" },
      title: { zh: "拥挤交易后的三套剧本：AI 再出发、轮动扩散或风险收缩", en: "Three post-crowding paths: AI renewal, broader rotation or risk contraction" },
      thesis: {
        zh: "当 AI 持仓拥挤且好消息被充分计价，资金可能继续推高核心链、扩散到医疗和价值板块，或在盈利无法验证资本开支时转向防御。重点不是猜唯一剧本，而是观察资金与盈利证据选择哪条路径。",
        en: "When AI positioning is crowded and good news is priced in, capital may renew the core chain, rotate toward healthcare and value, or turn defensive if earnings fail to validate capex. Evidence should select the path.",
      },
      evidenceToWatch: [
        { zh: "科技硬件资金流、市场宽度及等权重指数表现", en: "Technology-hardware flows, market breadth and equal-weight performance" },
        { zh: "医疗、价值、小盘与 AI 核心股的相对强弱", en: "Relative strength of healthcare, value, small caps and AI leaders" },
        { zh: "财报后的指引反应，而不只是是否超过当季预期", en: "Guidance reaction after earnings, not merely the quarterly beat" },
      ],
      confirmationSignals: [
        { zh: "AI 订单上修且市场宽度同步改善，支持再出发", en: "Rising AI orders with improving breadth support renewed expansion" },
        { zh: "AI 横盘而医疗/价值持续放量走强，支持轮动扩散", en: "AI consolidation with sustained healthcare/value strength supports rotation" },
      ],
      invalidationSignals: [
        { zh: "主要板块同时跌破关键结构且盈利预期下修", en: "Major sectors break structure together while earnings estimates fall" },
        { zh: "小盘上涨但盈利与现金流继续恶化", en: "Small caps rise while earnings and cash flow continue deteriorating" },
      ],
      portfolioUse: { zh: "用于调整观察优先级与分散风险，不自动改变正式周方向。", en: "Used to adjust research priority and diversification, never to overwrite the formal weekly direction." },
    },
    {
      id: "wealth-memory-cycle-v1",
      sourceVideoId: "zwlM6_UmWwo",
      sourceContentSha256: "FFD578D6B5AA8610C182C1E0356441414CE301C500E7F4951EFD20ECF4B15FC6",
      sourceTranscriptFile: "記憶體要跌！暴漲背後，竟然隱藏驚天陰謀！美股AI，下跌近在眼前？！下個股災開始了？【D的財富鏈⧸MU⧸三星⧸海力士】 [zwlM6_UmWwo].zh.vtt",
      sourcePublishedAt: null,
      verificationStatus: "TRANSCRIPT_IMPORTED_RESEARCH_PENDING",
      topics: ["MEMORY_CYCLE", "CAPITAL_CYCLE", "MONETARY_POLICY"],
      assets: ["MU", "SNDK", "SK_HYNIX", "SAMSUNG", "SOXX"],
      horizon: { zh: "未来 2—4 个季度；第三季度财报为首个复核窗", en: "Next two to four quarters; third-quarter earnings are the first review window" },
      title: { zh: "存储超级周期：供给纪律延长景气，但涨价最终可能破坏需求", en: "Memory supercycle: supply discipline extends demand, but pricing can destroy it" },
      thesis: {
        zh: "寡头供给纪律和 HBM 需求可以把传统周期拉长，却不能消灭周期。当价格涨幅超过下游承受能力，利润会从设备厂转移并可能压制消费、推高电子品通胀，最终反噬订单。",
        en: "Oligopoly supply discipline and HBM demand can extend, but not abolish, the cycle. Pricing beyond downstream tolerance shifts margins, pressures consumption and may eventually reduce orders.",
      },
      evidenceToWatch: [
        { zh: "HBM/DRAM/NAND 合约价、库存天数与新增产能", en: "HBM, DRAM and NAND contract pricing, inventory days and new capacity" },
        { zh: "PC、手机、服务器厂商毛利率及出货指引", en: "PC, handset and server vendor margins and shipment guidance" },
        { zh: "电子产品价格对通胀与消费需求的传导", en: "Pass-through from electronics pricing to inflation and consumer demand" },
      ],
      confirmationSignals: [
        { zh: "价格上涨同时下游出货、订单和毛利率保持稳定", en: "Pricing rises while downstream shipments, orders and margins remain stable" },
        { zh: "供给增量受控且库存没有出现拐点", en: "Supply additions remain controlled and inventory does not turn upward" },
      ],
      invalidationSignals: [
        { zh: "下游削减规格、延后采购或库存连续上升", en: "Customers reduce specifications, delay purchases or inventories rise persistently" },
        { zh: "厂商扩产重新加速，价格上涨却不能转化为自由现金流", en: "Capacity accelerates while higher prices fail to convert into free cash flow" },
      ],
      portfolioUse: { zh: "用于 MU/SNDK 等重点关注的基本面风险层；不能单独翻转技术或周度权威方向。", en: "A fundamental risk layer for MU and SNDK; it cannot independently reverse technical or weekly authority." },
    },
    {
      id: "wealth-ai-roic-v1",
      sourceVideoId: "a-Qeq2M_6t4",
      sourceContentSha256: "3C5C1D6EA92109503B3C6B68513792B7DB7E2E46FD9615FBD66571774DDAFA11",
      sourceTranscriptFile: "美股AI泡沫要炸了嗎？負債2.4兆！比資本支出高3倍！真相在這裡！【D的財富鏈⧸美股】 [a-Qeq2M_6t4].zh.vtt",
      sourcePublishedAt: null,
      verificationStatus: "TRANSCRIPT_IMPORTED_RESEARCH_PENDING",
      topics: ["CAPITAL_CYCLE", "VALUATION", "AI_INFRASTRUCTURE"],
      assets: ["MSFT", "GOOGL", "AMZN", "META", "QQQ", "SOXX"],
      horizon: { zh: "未来 2—3 年，按季跟踪", en: "Next two to three years, reviewed quarterly" },
      title: { zh: "AI 债务与估值：真正风险不是 AI 无用，而是资本回报不够", en: "AI debt and valuation: the key risk is inadequate return on capital" },
      thesis: {
        zh: "长期租赁、采购和建设承诺不应被简单等同于即时债务危机；但它们会锁定未来现金支出。估值的核心分叉是 AI 利润增量能否覆盖资本成本、折旧和融资成本。",
        en: "Long-term lease, purchase and construction commitments are not automatically an immediate debt crisis, but they lock in future cash outlays. Valuation hinges on whether AI profit growth covers capital, depreciation and financing costs.",
      },
      evidenceToWatch: [
        { zh: "表外承诺、租赁付款、采购承诺与到期结构", en: "Off-balance commitments, leases, purchase obligations and maturity structure" },
        { zh: "AI 相关收入、利润、自由现金流与投入资本回报率", en: "AI revenue, profit, free cash flow and return on invested capital" },
        { zh: "科技板块盈利预期与远期市盈率是否同向扩张", en: "Whether earnings expectations and forward multiples expand together" },
      ],
      confirmationSignals: [
        { zh: "AI 利润增长持续快于资本开支、折旧和利息成本", en: "AI profit growth persistently exceeds capex, depreciation and interest growth" },
        { zh: "现金流改善且承诺负担占收入比例下降", en: "Cash flow improves while commitments decline relative to revenue" },
      ],
      invalidationSignals: [
        { zh: "盈利小幅下修同时估值回到历史低位，形成双重压缩", en: "Even modest earnings cuts combine with multiple compression" },
        { zh: "新增投入继续增长但 AI 变现、利润率和现金流同步放缓", en: "Investment rises while monetization, margins and cash flow slow together" },
      ],
      portfolioUse: { zh: "作为科技股估值压力测试，不把标题式债务数字直接当作卖出信号。", en: "Used as a technology valuation stress test, not as a headline-driven sell signal." },
    },
    {
      id: "wealth-intc-policy-v1",
      sourceVideoId: "PZTnPsQU3I0",
      sourceContentSha256: "1E1AE766F79BADC358180CFE911BA9F17B075FFADC2F2E3B3295A529F4B16791",
      sourceTranscriptFile: "美國政府大力支持！打造美國台積電！這檔股票，還能繼續暴漲嗎？【D的財富鏈⧸美股⧸TSMC⧸INTC】 [PZTnPsQU3I0].zh.vtt",
      sourcePublishedAt: null,
      verificationStatus: "TRANSCRIPT_IMPORTED_RESEARCH_PENDING",
      topics: ["AI_INFRASTRUCTURE", "VALUATION", "CAPITAL_CYCLE"],
      assets: ["INTC", "TSM", "AMD", "NVDA"],
      horizon: { zh: "未来 4—12 个季度", en: "Next four to twelve quarters" },
      title: { zh: "政策重估与制造复兴：故事成立前先看良率、外部客户与代工亏损", en: "Policy repricing and manufacturing revival: validate yield, external customers and foundry losses" },
      thesis: {
        zh: "政策支持可以改变估值预期，但不能替代制程、良率、客户信任和代工经济性。股价上涨反映“可能成为美国先进制造核心”的愿景，并不等于商业模式已经兑现。",
        en: "Policy support can reprice expectations but cannot replace process technology, yield, customer trust or foundry economics. A rally may reflect the possibility of becoming a US manufacturing champion, not completed execution.",
      },
      evidenceToWatch: [
        { zh: "先进制程良率、量产节点和外部客户订单", en: "Advanced-node yield, production milestones and external customer orders" },
        { zh: "代工收入中内部交易占比与经营亏损", en: "Internal foundry revenue share and operating losses" },
        { zh: "PC、数据中心和代工三条业务的真实增长贡献", en: "Actual growth contribution from PC, data center and foundry" },
      ],
      confirmationSignals: [
        { zh: "外部客户收入占比上升、良率改善且代工亏损持续收窄", en: "External revenue rises, yields improve and foundry losses narrow" },
        { zh: "估值回落后基本面仍持续改善", en: "Fundamentals keep improving after valuation normalizes" },
      ],
      invalidationSignals: [
        { zh: "收入增长主要来自内部交易或一次性政策预期", en: "Growth remains mostly internal or driven by one-off policy expectations" },
        { zh: "高估值延续但良率、外部客户和亏损没有改善", en: "Valuation stays high without yield, customer or loss improvement" },
      ],
      portfolioUse: { zh: "列为政策与产业验证型观察，不在叙事最热时机械追价。", en: "A policy-and-industry validation watch, not a mechanical momentum chase." },
    },
    {
      id: "wealth-investor-discipline-v1",
      sourceVideoId: "q_Sjoksq8gI",
      sourceContentSha256: "D06BA52E8C2935A85E5F12613B83C5C2D9BDCF4CF6ECF5C88DF8B2ADC6698977",
      sourceTranscriptFile: "我的“反人性”投資秘訣！讓你買賣股票，勝率大增！【D的財富鏈⧸美股】 [q_Sjoksq8gI].zh.vtt",
      sourcePublishedAt: null,
      verificationStatus: "TRANSCRIPT_IMPORTED_RESEARCH_PENDING",
      topics: ["INVESTOR_DISCIPLINE", "VALUATION", "SECTOR_ROTATION"],
      assets: ["PORTFOLIO_PROCESS"],
      horizon: { zh: "长期方法；每笔决策复盘", en: "Long-term method; reviewed after every decision" },
      title: { zh: "反人性纪律：不把叙事、目标价、情绪或 AI 当成替自己负责的答案", en: "Contrarian discipline: do not outsource responsibility to narratives, targets, emotion or AI" },
      thesis: {
        zh: "机构掌握叙事、定价与流动性优势，散户最容易在涨高后追逐共识。更可靠的流程是先建立自己的证据链、估值区间、确认/失效条件和仓位纪律，再让 AI 提高研究效率，而不是把选择权交给 AI。",
        en: "Institutions hold narrative, pricing and liquidity advantages, while individuals often chase consensus late. A better process builds an independent evidence chain, valuation range, confirmation/invalidation rules and position discipline, using AI only to improve research efficiency.",
      },
      evidenceToWatch: [
        { zh: "买入理由是否可量化、可反证、可在事后复盘", en: "Whether the thesis is measurable, falsifiable and reviewable" },
        { zh: "目标价变化是否只是跟随股价，还是源于盈利假设变化", en: "Whether target changes follow price or genuine earnings assumptions" },
        { zh: "资金流与估值是否已经反映市场一致预期", en: "Whether flows and valuation already reflect consensus" },
      ],
      confirmationSignals: [
        { zh: "实际数据持续支持原假设，且风险收益比仍合理", en: "Observed data supports the thesis and risk-reward remains reasonable" },
        { zh: "复盘能明确区分判断错误、执行错误和不可控事件", en: "Reviews distinguish thesis errors, execution errors and uncontrollable events" },
      ],
      invalidationSignals: [
        { zh: "只有情绪、名人观点或单一目标价，没有可验证依据", en: "Only emotion, celebrity opinion or a target price supports the trade" },
        { zh: "模型输出与风险规则冲突时仍强制成交", en: "A model output is forced into execution despite risk-rule conflict" },
      ],
      portfolioUse: { zh: "作为全站研究与复盘纪律；任何 AI 结论都不能越过硬风控。", en: "A site-wide research discipline: no AI conclusion may bypass hard risk controls." },
    },
    {
      id: "wealth-fed-volatility-v1",
      sourceVideoId: "3FYekp7Om8o",
      sourceContentSha256: "B12B29D1E214C69CAB1F17975D251C39D516499DC5DA2382C50DF22739AB5251",
      sourceTranscriptFile: "我最怕的不是升息，而是這件事！美股投資大變天...FED新主席上任，FOMC首秀詳解【D的財富鏈⧸聯準會⧸美聯儲⧸華許】 [3FYekp7Om8o].zh.vtt",
      sourcePublishedAt: null,
      verificationStatus: "TRANSCRIPT_IMPORTED_RESEARCH_PENDING",
      topics: ["MONETARY_POLICY", "VALUATION", "SECTOR_ROTATION"],
      assets: ["DXY", "GLD", "SLV", "QQQ", "IWM", "KRE", "XLRE"],
      horizon: { zh: "下一次通胀/就业数据至后续议息窗口", en: "From the next inflation or jobs release through subsequent policy meetings" },
      title: { zh: "缺少前瞻指引的利率时代：波动率与估值折现比单次升降息更重要", en: "A low-guidance rate regime: volatility and discount rates matter more than one decision" },
      thesis: {
        zh: "当央行减少前瞻指引，市场会对每次通胀、就业、能源和财报数据重新定价。高利率首先压制高估值、弱现金流和融资敏感资产；美元与大宗商品的短期方向需随实际数据滚动修正。",
        en: "When forward guidance falls, inflation, jobs, energy and earnings data can trigger repeated repricing. Higher rates first pressure high-multiple, weak-cash-flow and financing-sensitive assets; dollar and commodity views must update with data.",
      },
      evidenceToWatch: [
        { zh: "PCE/CPI、就业、能源价格与点阵图/政策措辞", en: "PCE/CPI, employment, energy prices and policy projections/language" },
        { zh: "实际利率、美元指数与黄金白银的联动", en: "The relationship among real yields, the dollar, gold and silver" },
        { zh: "高估值 AI、房地产与区域银行的相对表现", en: "Relative performance of high-multiple AI, real estate and regional banks" },
      ],
      confirmationSignals: [
        { zh: "通胀与政策路径持续偏鹰，实际利率和美元同步走强", en: "Inflation and policy stay hawkish while real yields and the dollar rise" },
        { zh: "现金流弱、估值高的板块持续相对走弱", en: "Weak-cash-flow, high-multiple sectors underperform persistently" },
      ],
      invalidationSignals: [
        { zh: "通胀与就业明显降温，政策重新给出宽松路径", en: "Inflation and employment cool materially and policy regains an easing path" },
        { zh: "美元/实际利率走势与预设方向持续背离", en: "The dollar or real yields persistently diverge from the assumed path" },
      ],
      portfolioUse: { zh: "作为宏观折现率与事件波动层，不用单场会议机械翻转周度预测。", en: "A macro discount-rate and event-volatility layer, not a reason to mechanically reverse a weekly forecast." },
    },
  ],
};

export function getMemberWealthChainArchiveInternal(): MemberWealthChainPack {
  return validateWealthChainArchive(pack);
}

export function getMemberWealthChainView20260815(): MemberWealthChainView {
  return projectWealthChainForMember(pack);
}
