import { createHash } from "node:crypto";
import type { PaymentChain, VerifiedTransfer } from "@/types/membership";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function parseTokenAmount(value: string | number, decimals: number): number {
  const raw = BigInt(String(value));
  const divisor = BigInt(10) ** BigInt(decimals);
  return Number(raw / divisor) + Number(raw % divisor) / Number(divisor);
}

function base58Encode(bytes: Uint8Array): string {
  let n = BigInt(`0x${Buffer.from(bytes).toString("hex") || "0"}`);
  const zero = BigInt(0);
  const radix = BigInt(58);
  let encoded = "";
  while (n > zero) {
    const remainder = Number(n % radix);
    encoded = BASE58_ALPHABET[remainder] + encoded;
    n /= radix;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    encoded = `1${encoded}`;
  }
  return encoded || "1";
}

function tronHexToBase58(value: string): string {
  const clean = value.toLowerCase().replace(/^0x/, "");
  if (!/^41[0-9a-f]{40}$/.test(clean)) return value;
  const payload = Buffer.from(clean, "hex");
  const first = createHash("sha256").update(payload).digest();
  const second = createHash("sha256").update(first).digest();
  return base58Encode(Buffer.concat([payload, second.subarray(0, 4)]));
}

function normalizeTronAddress(value: string): string {
  const trimmed = value.trim();
  return /^41[0-9a-fA-F]{40}$/.test(trimmed.replace(/^0x/, ""))
    ? tronHexToBase58(trimmed)
    : trimmed;
}

function validateTimestamp(blockTimestamp: Date, expected: { notBefore: Date; notAfter: Date }): void {
  const ts = blockTimestamp.getTime();
  if (ts < expected.notBefore.getTime()) throw new Error("Transaction timestamp is before order creation");
  if (ts > expected.notAfter.getTime()) throw new Error("Transaction timestamp is after order expiry window");
}

export async function verifyTronTransfer(
  txHash: string,
  expected: {
    recipientAddress: string;
    tokenContract: string;
    expectedAmount: number;
    notBefore: Date;
    notAfter: Date;
  },
  apiKey?: string
): Promise<VerifiedTransfer> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers["TRON-PRO-API-KEY"] = apiKey;

  const infoRes = await fetch(`https://api.trongrid.io/v1/transactions/${txHash}`, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (infoRes.status === 404) throw new Error("TRON transaction not found yet");
  if (!infoRes.ok) throw new Error(`TRON transaction lookup unavailable (${infoRes.status})`);
  const infoJson = (await infoRes.json()) as { data?: Array<Record<string, unknown>> };
  const tx = infoJson.data?.[0];
  if (!tx) throw new Error("TRON transaction not found yet");

  const contractRet = (tx.ret as Array<{ contractRet?: string }> | undefined)?.[0]?.contractRet;
  if (contractRet && contractRet !== "SUCCESS") throw new Error("TRON transaction failed");

  const trc20Res = await fetch(
    `https://api.trongrid.io/v1/transactions/${txHash}/events?only_confirmed=true&contract_address=${encodeURIComponent(expected.tokenContract)}`,
    { headers, cache: "no-store", signal: AbortSignal.timeout(12_000) }
  );
  if (!trc20Res.ok) throw new Error(`TRON TRC20 events unavailable (${trc20Res.status})`);
  const eventsJson = (await trc20Res.json()) as {
    data?: Array<{
      block_number?: number;
      block_timestamp?: number;
      contract_address?: string;
      result?: Record<string, string>;
      event_name?: string;
    }>;
  };

  const expectedContract = normalizeTronAddress(expected.tokenContract);
  const transfer = eventsJson.data?.find((event) => {
    if (event.event_name !== "Transfer") return false;
    return normalizeTronAddress(event.contract_address ?? "") === expectedContract;
  });
  if (!transfer?.result) throw new Error("TRC20 transfer is not confirmed yet");

  const toRaw = transfer.result.to ?? transfer.result["1"];
  const fromRaw = transfer.result.from ?? transfer.result["0"];
  const value = transfer.result.value ?? transfer.result["2"];
  if (!toRaw || !value) throw new Error("Invalid TRC20 transfer payload");

  const to = normalizeTronAddress(toRaw);
  const from = fromRaw ? normalizeTronAddress(fromRaw) : "";
  if (to !== normalizeTronAddress(expected.recipientAddress)) {
    throw new Error("Transfer recipient does not match order receive address");
  }

  const amountNormalized = parseTokenAmount(value, 6);
  if (amountNormalized + 0.0000001 < expected.expectedAmount) {
    throw new Error(`Payment amount is less than order amount (${amountNormalized}/${expected.expectedAmount})`);
  }
  if (amountNormalized - 0.0000001 > expected.expectedAmount) {
    throw new Error(`Payment amount exceeds order amount (${amountNormalized}/${expected.expectedAmount})`);
  }

  const blockTimestamp = transfer.block_timestamp ? new Date(transfer.block_timestamp) : new Date();
  validateTimestamp(blockTimestamp, expected);

  return {
    chain: "TRON",
    txHash: txHash.toLowerCase(),
    blockNumber: transfer.block_number ?? null,
    senderAddress: from,
    recipientAddress: expected.recipientAddress,
    tokenContract: expected.tokenContract,
    amountRaw: String(value),
    amountNormalized,
    blockTimestamp,
    rawPayload: { tx, transfer },
  };
}

export async function verifyBscTransfer(
  txHash: string,
  expected: {
    recipientAddress: string;
    tokenContract: string;
    expectedAmount: number;
    notBefore: Date;
    notAfter: Date;
    rpcUrl: string;
    minConfirmations: number;
    tokenDecimals?: number;
  }
): Promise<VerifiedTransfer> {
  const receipt = await rpcCall<BscTransactionReceipt | null>(expected.rpcUrl, "eth_getTransactionReceipt", [txHash]);
  if (!receipt || Object.keys(receipt).length === 0) throw new Error("BSC transaction not found yet");
  if (receipt.status !== "0x1") throw new Error("BSC transaction failed");

  const blockHex = String(receipt.blockNumber ?? "");
  if (!/^0x[0-9a-f]+$/i.test(blockHex)) throw new Error("BSC transaction is not mined yet");
  const latestHex = String(await rpcCall<string>(expected.rpcUrl, "eth_blockNumber", []));
  const confirmations = parseInt(latestHex, 16) - parseInt(blockHex, 16) + 1;
  if (confirmations < expected.minConfirmations) {
    throw new Error(`Waiting for confirmations (${confirmations}/${expected.minConfirmations})`);
  }

  const block = await rpcCall<BscBlock | null>(expected.rpcUrl, "eth_getBlockByNumber", [blockHex, false]);
  const blockTimestamp = block?.timestamp
    ? new Date(parseInt(String(block.timestamp), 16) * 1000)
    : new Date();
  validateTimestamp(blockTimestamp, expected);

  const logs = receipt.logs ?? [];
  const tokenLower = expected.tokenContract.toLowerCase();
  const recipientTopic = `0x${padAddressTopic(expected.recipientAddress)}`;
  const transferLog = logs.find(
    (log) =>
      log.address?.toLowerCase() === tokenLower &&
      log.topics?.[0]?.toLowerCase() === TRANSFER_TOPIC &&
      log.topics?.[2]?.toLowerCase() === recipientTopic.toLowerCase()
  );
  if (!transferLog?.data) throw new Error("No BEP20 transfer to the configured receive address");

  const amountRaw = BigInt(transferLog.data);
  const amountNormalized = parseTokenAmount(amountRaw.toString(), expected.tokenDecimals ?? 18);
  if (amountNormalized + 0.0000001 < expected.expectedAmount) {
    throw new Error(`Payment amount is less than order amount (${amountNormalized}/${expected.expectedAmount})`);
  }
  if (amountNormalized - 0.0000001 > expected.expectedAmount) {
    throw new Error(`Payment amount exceeds order amount (${amountNormalized}/${expected.expectedAmount})`);
  }

  const fromTopic = transferLog.topics?.[1] ?? "";
  const senderAddress = `0x${fromTopic.slice(-40)}`;
  return {
    chain: "BSC",
    txHash: txHash.toLowerCase(),
    blockNumber: parseInt(blockHex, 16),
    senderAddress,
    recipientAddress: expected.recipientAddress,
    tokenContract: expected.tokenContract,
    amountRaw: amountRaw.toString(),
    amountNormalized,
    blockTimestamp,
    rawPayload: { receipt, transferLog, confirmations },
  };
}

function padAddressTopic(address: string): string {
  return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

type BscTransferLog = {
  address?: string;
  topics?: string[];
  data?: string;
};

type BscTransactionReceipt = {
  status?: string;
  blockNumber?: string;
  logs?: BscTransferLog[];
};

type BscBlock = {
  timestamp?: string;
};

async function rpcCall<T>(rpc: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`BSC RPC unavailable (${response.status})`);
  const json = (await response.json()) as { result?: T; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? "BSC RPC error");
  if (json.result === undefined) throw new Error("BSC RPC returned no result");
  return json.result;
}

export function validateTxHash(chain: PaymentChain, txHash: string): boolean {
  if (chain === "TRON") return /^[0-9a-fA-F]{64}$/.test(txHash);
  return /^0x[0-9a-fA-F]{64}$/.test(txHash);
}

export function isTemporaryVerificationError(message: string): boolean {
  return /not found yet|not confirmed yet|events unavailable|lookup unavailable|waiting for confirmations|not mined yet|rpc unavailable|timeout|fetch failed|rate limit|429|503/i.test(message);
}

export function isUnderpaymentError(message: string): boolean {
  return /less than order amount/i.test(message);
}

export type { VerifiedTransfer };
