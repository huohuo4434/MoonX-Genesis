-- MOOX V7.20.3.1 additive unified live-trading custody tables.
CREATE TABLE IF NOT EXISTS "MooxUnifiedLiveAccount" (
  "id" TEXT NOT NULL,
  "ownerKey" TEXT NOT NULL,
  "accountScope" TEXT NOT NULL,
  "displayName" TEXT,
  "agentId" TEXT,
  "mode" TEXT NOT NULL DEFAULT 'MANAGE_ONLY',
  "newEntriesEnabled" BOOLEAN NOT NULL DEFAULT false,
  "positionManagementEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MooxUnifiedLiveAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MooxUnifiedLiveAccount_ownerKey_key" ON "MooxUnifiedLiveAccount"("ownerKey");
CREATE UNIQUE INDEX IF NOT EXISTS "MooxUnifiedLiveAccount_agentId_key" ON "MooxUnifiedLiveAccount"("agentId");
CREATE INDEX IF NOT EXISTS "MooxUnifiedLiveAccount_accountScope_mode_idx" ON "MooxUnifiedLiveAccount"("accountScope", "mode");

CREATE TABLE IF NOT EXISTS "MooxUnifiedLiveSetting" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "horizon" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sizingMode" TEXT NOT NULL,
  "sizingValue" DOUBLE PRECISION NOT NULL,
  "leverage" INTEGER NOT NULL DEFAULT 1,
  "maxOpenPositions" INTEGER NOT NULL DEFAULT 1,
  "maxLossPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "dailyLossPercent" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "weeklyLossPercent" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  "maxMarginUsePercent" DOUBLE PRECISION NOT NULL DEFAULT 25,
  "target1ReducePercent" DOUBLE PRECISION NOT NULL DEFAULT 30,
  "isolatedMargin" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MooxUnifiedLiveSetting_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MooxUnifiedLiveSetting_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MooxUnifiedLiveAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MooxUnifiedLiveSetting_accountId_horizon_key" ON "MooxUnifiedLiveSetting"("accountId", "horizon");
CREATE INDEX IF NOT EXISTS "MooxUnifiedLiveSetting_horizon_enabled_idx" ON "MooxUnifiedLiveSetting"("horizon", "enabled");

CREATE TABLE IF NOT EXISTS "MooxUnifiedLiveSlice" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "horizon" TEXT NOT NULL,
  "side" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "sourceKind" TEXT NOT NULL,
  "exchangePositionKey" TEXT,
  "strategyDecisionId" TEXT,
  "marginAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notionalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "leverage" INTEGER NOT NULL DEFAULT 1,
  "entryPrice" DOUBLE PRECISION NOT NULL,
  "stopPrice" DOUBLE PRECISION,
  "target1" DOUBLE PRECISION,
  "target2" DOUBLE PRECISION,
  "maxHoldMinutes" INTEGER NOT NULL,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastManagedAt" TIMESTAMP(3),
  "nextCheckAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "closeReason" TEXT,
  "qimenDirection" TEXT,
  "liuyaoDirection" TEXT,
  "resonance" TEXT,
  "technicalEntry" TEXT,
  "publicVisible" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MooxUnifiedLiveSlice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MooxUnifiedLiveSlice_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MooxUnifiedLiveAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MooxUnifiedLiveSlice_accountId_status_idx" ON "MooxUnifiedLiveSlice"("accountId", "status");
CREATE INDEX IF NOT EXISTS "MooxUnifiedLiveSlice_symbol_status_idx" ON "MooxUnifiedLiveSlice"("symbol", "status");
CREATE INDEX IF NOT EXISTS "MooxUnifiedLiveSlice_exchangePositionKey_idx" ON "MooxUnifiedLiveSlice"("exchangePositionKey");

CREATE TABLE IF NOT EXISTS "MooxUnifiedLiveEvent" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "symbol" TEXT,
  "sliceId" TEXT,
  "positionKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MooxUnifiedLiveEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MooxUnifiedLiveEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MooxUnifiedLiveAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MooxUnifiedLiveEvent_accountId_createdAt_idx" ON "MooxUnifiedLiveEvent"("accountId", "createdAt");
CREATE INDEX IF NOT EXISTS "MooxUnifiedLiveEvent_code_severity_idx" ON "MooxUnifiedLiveEvent"("code", "severity");
