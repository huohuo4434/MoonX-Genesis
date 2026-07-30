/**
 * MOOX Conviction List — curated multi-asset research (STOCK / CRYPTO / …).
 * Public fundamentals vs member forecasts are separated.
 */

export type ConvictionAssetType = "STOCK" | "CRYPTO" | "ETF" | "INDEX" | "COMMODITY";

export type ConvictionRiskLevel = "低" | "中" | "中高" | "高" | "极高";

export type ConvictionAssetStatus = "draft" | "published" | "archived";

export type ConvictionAsset = {
  id: string;
  slug: string;
  assetType: ConvictionAssetType;
  nameZh: string;
  nameEn: string;
  /** Optional Chinese display alias (e.g. Asteroid). */
  aliasZh?: string;
  /** Historical / search aliases — never create separate assets. */
  aliases?: string[];
  symbol: string;
  exchange?: string | null;
  network?: string | null;
  contractAddress?: string | null;
  /** When true, show “合约信息待管理员确认” instead of inventing a contract. */
  contractPendingAdminConfirm: boolean;
  logoUrl?: string | null;
  status: ConvictionAssetStatus;
  riskLevel: ConvictionRiskLevel;
  rating: string;
  tags: string[];
  summaryZh: string;
  summaryEn: string;
  thesisZh: string[];
  thesisEn: string[];
  catalystsZh: string[];
  catalystsEn: string[];
  risksZh: string[];
  risksEn: string[];
  marketCap?: number | null;
  marketCapCurrency?: string | null;
  marketCapUpdatedAt?: string | null;
  researchUpdatedAt: string;
  displayOrder: number;
  isPublished: boolean;
  /** Links member forecast store (changxin stockId) when present. */
  memberForecastStockId?: string | null;
};

/** Public API / page payload — never includes forecast directions or levels. */
export type ConvictionPublicCard = {
  id: string;
  slug: string;
  assetType: ConvictionAssetType;
  nameZh: string;
  nameEn: string;
  aliasZh?: string;
  symbol: string;
  exchange: string | null;
  network: string | null;
  contractAddress: string | null;
  contractPendingAdminConfirm: boolean;
  riskLevel: ConvictionRiskLevel;
  rating: string;
  tags: string[];
  summaryZh: string;
  summaryEn: string;
  thesisZh: string[];
  thesisEn: string[];
  catalystsZh: string[];
  catalystsEn: string[];
  risksZh: string[];
  risksEn: string[];
  marketCap: number | null;
  marketCapCurrency: string | null;
  marketCapUpdatedAt: string | null;
  researchUpdatedAt: string;
  researchStatusZh: string;
  researchStatusEn: string;
  detailHref: string;
};

export type ConvictionMemberLockPreview = {
  key: string;
  labelZh: string;
  labelEn: string;
};

export type ConvictionAccessMode = "publicOnly" | "fullAccess";
