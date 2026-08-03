CREATE TABLE IF NOT EXISTS "TrustedDevice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deviceIdHash" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "userAgentFamily" TEXT,
  "platformFamily" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "lastIpHash" TEXT,
  "lastRegion" TEXT,
  CONSTRAINT "TrustedDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TrustedDevice_userId_deviceIdHash_key" ON "TrustedDevice"("userId", "deviceIdHash");
CREATE INDEX IF NOT EXISTS "TrustedDevice_userId_revokedAt_idx" ON "TrustedDevice"("userId", "revokedAt");
CREATE INDEX IF NOT EXISTS "TrustedDevice_lastSeenAt_idx" ON "TrustedDevice"("lastSeenAt");

CREATE TABLE IF NOT EXISTS "MemberAccessLease" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deviceIdHash" TEXT NOT NULL,
  "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "heartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "switchCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MemberAccessLease_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MemberAccessLease_userId_key" ON "MemberAccessLease"("userId");
CREATE INDEX IF NOT EXISTS "MemberAccessLease_deviceIdHash_idx" ON "MemberAccessLease"("deviceIdHash");
CREATE INDEX IF NOT EXISTS "MemberAccessLease_expiresAt_idx" ON "MemberAccessLease"("expiresAt");

CREATE TABLE IF NOT EXISTS "SecurityEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deviceId" TEXT,
  "eventType" TEXT NOT NULL,
  "actorUserId" TEXT,
  "detail" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SecurityEvent_userId_createdAt_idx" ON "SecurityEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "SecurityEvent_eventType_createdAt_idx" ON "SecurityEvent"("eventType", "createdAt");
