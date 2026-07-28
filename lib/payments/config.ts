import "server-only";

import type { PaymentChain } from "@/types/membership";

const DEFAULT_TRC20 = "TTwZUWZiQfbMm9iyL2iT9qDivWqHttvmZ2";
const DEFAULT_BEP20 = "0xC52285BE6867d50dFe2B470765AfDae48Ede18c6";
const DEFAULT_TRON_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const DEFAULT_BSC_TOKEN = "0x55d398326f99059fF775485246999027B3197955";

export function getPaymentConfig() {
  return {
    supportEmail: process.env.MOONX_SUPPORT_EMAIL ?? "jackzwin999@gmail.com",
    trc20Address: process.env.MOONX_TRC20_RECEIVE_ADDRESS ?? DEFAULT_TRC20,
    bep20Address: process.env.MOONX_BEP20_RECEIVE_ADDRESS ?? DEFAULT_BEP20,
    tronUsdtContract: process.env.TRON_USDT_CONTRACT ?? DEFAULT_TRON_USDT,
    bscTokenContract: process.env.BSC_PAYMENT_TOKEN_CONTRACT ?? DEFAULT_BSC_TOKEN,
    /** BEP20 requires BEP20_PAYMENTS_ENABLED=true and MOONX_BEP20_ENABLED=true */
    bep20Enabled:
      process.env.BEP20_PAYMENTS_ENABLED === "true" &&
      process.env.MOONX_BEP20_ENABLED === "true",
    bscConfirmations: Number(process.env.BSC_CONFIRMATIONS ?? "12"),
    orderTtlMinutes: 30,
    tronGridApiKey: process.env.TRONGRID_API_KEY,
    bscRpcUrl: process.env.BSC_RPC_URL ?? "https://bsc-dataseed.binance.org",
  };
}

export function chainTokenMeta(chain: PaymentChain) {
  const cfg = getPaymentConfig();
  if (chain === "TRON") {
    return {
      chain,
      tokenSymbol: "USDT",
      tokenName: "USDT-TRC20",
      tokenContract: cfg.tronUsdtContract,
      recipientAddress: cfg.trc20Address,
      decimals: 6,
      warningText:
        "仅接受 TRON 网络上的官方 USDT（TRC20）。请勿发送 TRX、其他代币或错误网络资产。错链错币无法自动找回。",
      networkLabel: "TRON TRC20",
    };
  }
  return {
    chain,
    tokenSymbol: "BSC-USD",
    tokenName: "Binance-Peg BSC-USD",
    tokenContract: cfg.bscTokenContract,
    recipientAddress: cfg.bep20Address,
    decimals: 18,
    warningText:
      "仅接受 BNB Smart Chain 上指定 BEP20 合约代币。请勿发送 BNB、其他代币或假 USDT。错链错币无法自动找回。",
    networkLabel: "BNB Smart Chain BEP20",
  };
}

export function paymentQrPayload(chain: PaymentChain, address: string, amount: number): string {
  if (chain === "TRON") {
    return `tron:${address}?amount=${amount}&token=USDT`;
  }
  return `ethereum:${address}@${56}?value=0`;
}

export function normalizeAddress(chain: PaymentChain, address: string): string {
  if (chain === "BSC") return address.toLowerCase();
  return address;
}

export function addressesEqual(chain: PaymentChain, a: string, b: string): boolean {
  if (chain === "BSC") return a.toLowerCase() === b.toLowerCase();
  return a === b;
}

export function contractsEqual(chain: PaymentChain, a: string, b: string): boolean {
  if (chain === "BSC") return a.toLowerCase() === b.toLowerCase();
  return a === b;
}
