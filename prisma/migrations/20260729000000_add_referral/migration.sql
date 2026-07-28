-- CreateTable
CREATE TABLE IF NOT EXISTS "ReferralInvite" (
    "id" TEXT NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "invite_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReferralRecord" (
    "id" TEXT NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "invitee_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reward_days" INTEGER NOT NULL DEFAULT 7,
    "device_id" TEXT,
    "flagged_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralInvite_invite_code_key" ON "ReferralInvite"("invite_code");
CREATE INDEX IF NOT EXISTS "ReferralInvite_inviter_id_idx" ON "ReferralInvite"("inviter_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralRecord_invitee_id_key" ON "ReferralRecord"("invitee_id");
CREATE INDEX IF NOT EXISTS "ReferralRecord_inviter_id_idx" ON "ReferralRecord"("inviter_id");
CREATE INDEX IF NOT EXISTS "ReferralRecord_status_idx" ON "ReferralRecord"("status");
CREATE INDEX IF NOT EXISTS "ReferralRecord_payment_id_idx" ON "ReferralRecord"("payment_id");
