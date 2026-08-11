export type LiveExecutionStage =
  | "LOCAL_PREFLIGHT"
  | "ACCOUNT_CONFIG_WRITE"
  | "REMOTE_ORDER_WRITE"
  | "AMBIGUOUS_WRITE"
  | "STATUS_QUERY";

export type RemoteFailureDescriptor = {
  message: string;
  bitgetCode?: string | null;
  httpStatus?: number | null;
  ambiguous?: boolean;
};

export function buildUtaMarketOrderBody(input: {
  category: string;
  symbol: string;
  qty: string;
  side: "buy" | "sell";
  clientOid: string;
  reduceOnly: boolean;
  hedgeMode: boolean;
  posSide: "long" | "short";
  stopLoss?: number;
  takeProfit?: number;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    category: input.category,
    symbol: input.symbol,
    qty: input.qty,
    side: input.side,
    orderType: "market",
    clientOid: input.clientOid,
    marginMode: "isolated",
  };

  // Bitget UTA rejects requests that assign both posSide and reduceOnly.
  // In hedge mode posSide unambiguously identifies the opening/closing leg;
  // one-way mode continues to use reduceOnly as before.
  if (input.hedgeMode) body.posSide = input.posSide;
  else body.reduceOnly = input.reduceOnly ? "yes" : "no";

  if (!input.reduceOnly && input.stopLoss && input.stopLoss > 0) {
    body.stopLoss = input.stopLoss.toFixed(8).replace(/\.?0+$/, "");
    body.slTriggerBy = "mark";
    body.slOrderType = "market";
  }
  if (!input.reduceOnly && input.takeProfit && input.takeProfit > 0) {
    body.takeProfit = input.takeProfit.toFixed(8).replace(/\.?0+$/, "");
    body.tpTriggerBy = "mark";
    body.tpOrderType = "market";
  }
  return body;
}

export class LiveTradeExecutionError extends Error {
  readonly stage: LiveExecutionStage;
  readonly bitgetCode: string | null;
  readonly httpStatus: number | null;
  readonly remoteSubmissionAttempted: boolean;
  readonly clientOid: string | null;
  readonly symbol: string | null;
  readonly action: string | null;

  constructor(input: {
    message: string;
    stage: LiveExecutionStage;
    bitgetCode?: string | null;
    httpStatus?: number | null;
    remoteSubmissionAttempted?: boolean;
    clientOid?: string | null;
    symbol?: string | null;
    action?: string | null;
  }) {
    super(input.message);
    this.name = "LiveTradeExecutionError";
    this.stage = input.stage;
    this.bitgetCode = input.bitgetCode ?? null;
    this.httpStatus = input.httpStatus ?? null;
    this.remoteSubmissionAttempted = Boolean(input.remoteSubmissionAttempted);
    this.clientOid = input.clientOid ?? null;
    this.symbol = input.symbol ?? null;
    this.action = input.action ?? null;
  }
}

export function liveExecutionErrorFrom(
  error: unknown,
  input: {
    stage: LiveExecutionStage;
    remoteSubmissionAttempted?: boolean;
    clientOid?: string | null;
    symbol?: string | null;
    action?: string | null;
    describe: (error: unknown) => RemoteFailureDescriptor;
  }
): LiveTradeExecutionError {
  if (error instanceof LiveTradeExecutionError) {
    return new LiveTradeExecutionError({
      message: error.message,
      stage: error.stage,
      bitgetCode: error.bitgetCode,
      httpStatus: error.httpStatus,
      remoteSubmissionAttempted: error.remoteSubmissionAttempted || Boolean(input.remoteSubmissionAttempted),
      clientOid: error.clientOid ?? input.clientOid ?? null,
      symbol: error.symbol ?? input.symbol ?? null,
      action: error.action ?? input.action ?? null,
    });
  }
  const descriptor = input.describe(error);
  return new LiveTradeExecutionError({
    message: descriptor.message,
    stage: input.stage,
    bitgetCode: descriptor.bitgetCode ?? null,
    httpStatus: descriptor.httpStatus ?? null,
    remoteSubmissionAttempted: input.remoteSubmissionAttempted,
    clientOid: input.clientOid,
    symbol: input.symbol,
    action: input.action,
  });
}

export function serializeLiveExecutionError(error: LiveTradeExecutionError): Record<string, unknown> {
  return {
    stage: error.stage,
    bitgetCode: error.bitgetCode,
    httpStatus: error.httpStatus,
    remoteSubmissionAttempted: error.remoteSubmissionAttempted,
    clientOid: error.clientOid,
    symbol: error.symbol,
    action: error.action,
    message: error.message,
  };
}

export function isDefiniteRemoteOrderWrite(error: unknown): boolean {
  return error instanceof LiveTradeExecutionError && error.stage === "REMOTE_ORDER_WRITE";
}

export function isUtaHedgeMode(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
  return normalized === "hedge_mode" || normalized === "double_side_hold" || normalized === "double_side_mode";
}

export type UtaHoldMode = "one_way_mode" | "hedge_mode" | string;

export type UtaSymbolConfig = {
  category?: string;
  symbol?: string;
  marginMode?: string;
  leverage?: string | number | Array<string | number>;
};

export type UtaSettingsLike = {
  holdMode?: UtaHoldMode;
  symbolConfigList?: UtaSymbolConfig[];
};

function normalizedLeverages(value: unknown): number[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function leverageMatches(value: unknown, desiredLeverage: number, hedgeIsolated: boolean): boolean {
  const values = normalizedLeverages(value);
  const first = values[0];
  if (first === undefined) return false;
  if (!hedgeIsolated) return Math.abs(first - desiredLeverage) < 1e-9;

  // UTA account/settings documents hedge leverage as an array. Do not treat
  // "first side happens to be 2x" as fully configured when the second side
  // may still differ. If Bitget returns a scalar, it represents one common
  // leverage and can still be accepted.
  return values.every((item) => Math.abs(item - desiredLeverage) < 1e-9);
}

export function planUtaLeverageConfiguration(input: {
  settings: UtaSettingsLike;
  symbol: string;
  leverage: number;
  marginMode: "isolated" | "crossed";
  posSide: "long" | "short";
  category?: string;
}): {
  required: boolean;
  body: Record<string, string>;
  reason: string;
} {
  const category = input.category ?? "USDT-FUTURES";
  const current = (input.settings.symbolConfigList ?? []).find((row) =>
    String(row.category ?? "").toUpperCase() === category &&
    String(row.symbol ?? "").toUpperCase() === input.symbol.toUpperCase()
  );
  const currentMode = String(current?.marginMode ?? "").toLowerCase();
  const desiredLeverage = Number(input.leverage);
  const hedgeIsolated =
    isUtaHedgeMode(input.settings.holdMode) &&
    input.marginMode === "isolated";
  const alreadyConfigured =
    currentMode === input.marginMode &&
    leverageMatches(current?.leverage, desiredLeverage, hedgeIsolated);

  const body: Record<string, string> = {
    category,
    symbol: input.symbol,
    leverage: String(input.leverage),
    marginMode: input.marginMode,
  };

  if (hedgeIsolated) {
    // The live account returned Bitget 25200 while using only leverage +
    // posSide in DOUBLE_SIDE_HOLD. Keep the documented isolated-margin
    // posSide and also make both post-change directional leverages explicit.
    // This fixes the server-side afterLongLeverage/afterShortLeverage NONE
    // validation without switching hold mode or changing order-side semantics.
    body.posSide = input.posSide;
    body.longLeverage = String(input.leverage);
    body.shortLeverage = String(input.leverage);
  }

  return {
    required: !alreadyConfigured,
    body,
    reason: alreadyConfigured
      ? `${input.symbol} already ${input.marginMode} ${input.leverage}x`
      : `${input.symbol} requires ${input.marginMode} ${input.leverage}x configuration`,
  };
}

export type OrderDispatchResult<T> =
  | { kind: "ACKNOWLEDGED"; order: T; recovered: boolean; remoteSubmissionAttempted: boolean }
  | { kind: "FAILED"; error: LiveTradeExecutionError };

export async function runIdempotentOrderDispatch<T>(input: {
  clientOid: string;
  symbol: string;
  action: string;
  prepareLocal?: () => Promise<void>;
  configureAccount?: () => Promise<void>;
  queryExisting: () => Promise<T | null>;
  submitOrder: (onRemoteDispatch: () => void) => Promise<T>;
  describeError: (error: unknown) => RemoteFailureDescriptor;
}): Promise<OrderDispatchResult<T>> {
  let existing: T | null;
  try {
    existing = await input.queryExisting();
  } catch (error) {
    const descriptor = input.describeError(error);
    const expectedAbsent = descriptor.bitgetCode === "25204" ||
      /\b25204\b.*(?:订单不存在|order\s+does\s+not\s+exist)/i.test(descriptor.message);
    if (expectedAbsent) {
      // V7.17.9_PRECHECK_25204_IS_ABSENCE: a brand-new clientOid is supposed to be absent.
      existing = null;
    } else {
      return {
        kind: "FAILED",
        error: liveExecutionErrorFrom(error, {
          stage: "STATUS_QUERY",
          remoteSubmissionAttempted: false,
          clientOid: input.clientOid,
          symbol: input.symbol,
          action: input.action,
          describe: input.describeError,
        }),
      };
    }
  }
  if (existing) {
    return { kind: "ACKNOWLEDGED", order: existing, recovered: true, remoteSubmissionAttempted: false };
  }

  if (input.prepareLocal) {
    try {
      await input.prepareLocal();
    } catch (error) {
      return {
        kind: "FAILED",
        error: liveExecutionErrorFrom(error, {
          stage: "LOCAL_PREFLIGHT",
          remoteSubmissionAttempted: false,
          clientOid: input.clientOid,
          symbol: input.symbol,
          action: input.action,
          describe: input.describeError,
        }),
      };
    }
  }

  if (input.configureAccount) {
    try {
      await input.configureAccount();
    } catch (error) {
      return {
        kind: "FAILED",
        error: liveExecutionErrorFrom(error, {
          stage: "ACCOUNT_CONFIG_WRITE",
          remoteSubmissionAttempted: false,
          clientOid: input.clientOid,
          symbol: input.symbol,
          action: input.action,
          describe: input.describeError,
        }),
      };
    }
  }

  let remoteSubmissionAttempted = false;
  try {
    const order = await input.submitOrder(() => {
      remoteSubmissionAttempted = true;
    });
    return { kind: "ACKNOWLEDGED", order, recovered: false, remoteSubmissionAttempted };
  } catch (error) {
    const descriptor = input.describeError(error);
    if (!remoteSubmissionAttempted) {
      return {
        kind: "FAILED",
        error: new LiveTradeExecutionError({
          message: descriptor.message,
          stage: "LOCAL_PREFLIGHT",
          bitgetCode: descriptor.bitgetCode ?? null,
          httpStatus: descriptor.httpStatus ?? null,
          remoteSubmissionAttempted: false,
          clientOid: input.clientOid,
          symbol: input.symbol,
          action: input.action,
        }),
      };
    }
    if (!descriptor.ambiguous) {
      return {
        kind: "FAILED",
        error: new LiveTradeExecutionError({
          message: descriptor.message,
          stage: "REMOTE_ORDER_WRITE",
          bitgetCode: descriptor.bitgetCode ?? null,
          httpStatus: descriptor.httpStatus ?? null,
          remoteSubmissionAttempted: true,
          clientOid: input.clientOid,
          symbol: input.symbol,
          action: input.action,
        }),
      };
    }

    try {
      const recovered = await input.queryExisting();
      if (recovered) {
        return { kind: "ACKNOWLEDGED", order: recovered, recovered: true, remoteSubmissionAttempted: true };
      }
      return {
        kind: "FAILED",
        error: new LiveTradeExecutionError({
          message: `${descriptor.message}; order status remains unknown after clientOid lookup`,
          stage: "AMBIGUOUS_WRITE",
          bitgetCode: descriptor.bitgetCode ?? null,
          httpStatus: descriptor.httpStatus ?? null,
          remoteSubmissionAttempted: true,
          clientOid: input.clientOid,
          symbol: input.symbol,
          action: input.action,
        }),
      };
    } catch (queryError) {
      const queryDescriptor = input.describeError(queryError);
      const expectedAbsent = queryDescriptor.bitgetCode === "25204" ||
        /\b25204\b.*(?:订单不存在|order\s+does\s+not\s+exist)/i.test(queryDescriptor.message);
      if (expectedAbsent) {
        return {
          kind: "FAILED",
          error: new LiveTradeExecutionError({
            // V7.17.9_POSTWRITE_25204_IS_AMBIGUOUS_NOT_QUERY_FAILURE
            message: `${descriptor.message}; order is not visible yet after clientOid lookup`,
            stage: "AMBIGUOUS_WRITE",
            bitgetCode: descriptor.bitgetCode ?? null,
            httpStatus: descriptor.httpStatus ?? null,
            remoteSubmissionAttempted: true,
            clientOid: input.clientOid,
            symbol: input.symbol,
            action: input.action,
          }),
        };
      }
      return {
        kind: "FAILED",
        error: new LiveTradeExecutionError({
          message: `${descriptor.message}; clientOid status query failed: ${queryDescriptor.message}`,
          stage: "STATUS_QUERY",
          bitgetCode: queryDescriptor.bitgetCode ?? descriptor.bitgetCode ?? null,
          httpStatus: queryDescriptor.httpStatus ?? descriptor.httpStatus ?? null,
          remoteSubmissionAttempted: true,
          clientOid: input.clientOid,
          symbol: input.symbol,
          action: input.action,
        }),
      };
    }
  }
}
