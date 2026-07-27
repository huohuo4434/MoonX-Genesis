import type { PaymentChain, VerifiedTransfer } from "@/types/membership";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function parseTronAmount(value: string | number, decimals = 6): number {
  const raw = BigInt(String(value));
  const divisor = BigInt(10) ** BigInt(decimals);
  return Number(raw / divisor) + Number(raw % divisor) / Number(divisor);
}

export async function verifyTronTransfer(
  txHash: string,
  expected: {
    recipientAddress: string;
    tokenContract: string;
    minAmount: number;
    orderCreatedAt: Date;
  },
  apiKey?: string
): Promise<VerifiedTransfer> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers["TRON-PRO-API-KEY"] = apiKey;

  const infoRes = await fetch(`https://api.trongrid.io/v1/transactions/${txHash}`, { headers });
  if (!infoRes.ok) throw new Error("TRON transaction not found");
  const infoJson = (await infoRes.json()) as { data?: Array<Record<string, unknown>> };
  const tx = infoJson.data?.[0];
  if (!tx) throw new Error("TRON transaction not found");

  const contractRet = (tx.ret as Array<{ contractRet?: string }> | undefined)?.[0]?.contractRet;
  if (contractRet && contractRet !== "SUCCESS") throw new Error("TRON transaction failed");

  const trc20Res = await fetch(
    `https://api.trongrid.io/v1/transactions/${txHash}/events?only_confirmed=true`,
    { headers }
  );
  if (!trc20Res.ok) throw new Error("TRON TRC20 events unavailable");
  const eventsJson = (await trc20Res.json()) as {
    data?: Array<{
      block_number?: number;
      block_timestamp?: number;
      contract_address?: string;
      result?: Record<string, string>;
      event_name?: string;
    }>;
  };

  const transfer = eventsJson.data?.find(
    (e) => e.event_name === "Transfer" && e.contract_address === expected.tokenContract
  );
  if (!transfer?.result) throw new Error("No TRC20 Transfer for official USDT contract");

  const to = transfer.result.to ?? transfer.result["1"];
  const from = transfer.result.from ?? transfer.result["0"];
  const value = transfer.result.value ?? transfer.result["2"];
  if (!to || !value) throw new Error("Invalid TRC20 transfer payload");
  if (to !== expected.recipientAddress) {
    throw new Error("Transfer recipient does not match order receive address");
  }

  const amountNormalized = parseTronAmount(value, 6);
  if (amountNormalized + 1e-8 < expected.minAmount) {
    throw new Error("Payment amount is less than order amount");
  }

  const blockTs = transfer.block_timestamp ? new Date(transfer.block_timestamp) : new Date();
  if (blockTs.getTime() < expected.orderCreatedAt.getTime() - 60_000) {
    throw new Error("Transaction timestamp is before order creation");
  }

  return {
    chain: "TRON",
    txHash,
    blockNumber: transfer.block_number ?? null,
    senderAddress: from ?? "",
    recipientAddress: expected.recipientAddress,
    tokenContract: expected.tokenContract,
    amountRaw: String(value),
    amountNormalized,
    blockTimestamp: blockTs,
    rawPayload: { tx, transfer },
  };
}

export async function verifyBscTransfer(
  txHash: string,
  expected: {
    recipientAddress: string;
    tokenContract: string;
    minAmount: number;
    orderCreatedAt: Date;
    rpcUrl: string;
    minConfirmations: number;
  }
): Promise<VerifiedTransfer> {
  const receipt = await rpcCall(expected.rpcUrl, "eth_getTransactionReceipt", [txHash]);
  if (!receipt || receipt.status !== "0x1") throw new Error("BSC transaction failed or not found");

  const blockHex = String(receipt.blockNumber);
  const latestHex = String(await rpcCall(expected.rpcUrl, "eth_blockNumber", []));
  const confirmations = parseInt(latestHex, 16) - parseInt(blockHex, 16);
  if (confirmations < expected.minConfirmations) {
    throw new Error(`Waiting for confirmations (${confirmations}/${expected.minConfirmations})`);
  }

  const block = await rpcCall(expected.rpcUrl, "eth_getBlockByNumber", [blockHex, false]);
  const blockTs = block?.timestamp ? new Date(parseInt(String(block.timestamp), 16) * 1000) : new Date();
  if (blockTs.getTime() < expected.orderCreatedAt.getTime() - 60_000) {
    throw new Error("Transaction timestamp is before order creation");
  }

  const logs = (receipt.logs ?? []) as Array<{ address: string; topics: string[]; data: string }>;
  const tokenLower = expected.tokenContract.toLowerCase();
  const recipientTopic = "0x" + padAddressTopic(expected.recipientAddress);

  const transferLog = logs.find(
    (log) =>
      log.address.toLowerCase() === tokenLower &&
      log.topics[0]?.toLowerCase() === TRANSFER_TOPIC &&
      log.topics[2]?.toLowerCase() === recipientTopic.toLowerCase()
  );
  if (!transferLog) throw new Error("No BEP20 Transfer to receive address for whitelisted contract");

  const amountRaw = BigInt(transferLog.data);
  const amountNormalized = Number(amountRaw) / 1e18;
  if (amountNormalized + 1e-12 < expected.minAmount) {
    throw new Error("Payment amount is less than order amount");
  }

  const fromTopic = transferLog.topics[1] ?? "";
  const sender = "0x" + fromTopic.slice(-40);

  return {
    chain: "BSC",
    txHash: txHash.toLowerCase(),
    blockNumber: parseInt(blockHex, 16),
    senderAddress: sender,
    recipientAddress: expected.recipientAddress,
    tokenContract: expected.tokenContract,
    amountRaw: amountRaw.toString(),
    amountNormalized,
    blockTimestamp: blockTs,
    rawPayload: { receipt, transferLog },
  };
}

function padAddressTopic(address: string): string {
  return address.toLowerCase().replace("0x", "").padStart(64, "0");
}

async function rpcCall(rpc: string, method: string, params: unknown[]): Promise<Record<string, unknown>> {
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: Record<string, unknown>; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result ?? {};
}

export function validateTxHash(chain: PaymentChain, txHash: string): boolean {
  if (chain === "TRON") return /^[0-9a-fA-F]{64}$/.test(txHash);
  return /^0x[0-9a-fA-F]{64}$/.test(txHash);
}

export type { VerifiedTransfer };
