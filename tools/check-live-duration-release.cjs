// Read-only deployment checks. Never changes lifecycle, permissions or orders.
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient({ log: [] });
async function main() {
  const columns = await db.$queryRawUnsafe("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='trade_bitget_live_experiment' AND column_name IN ('duration_mode','entry_epoch_at','ends_at')");
  const lifecycle = await db.$queryRawUnsafe("SELECT status, started_at, ends_at, to_jsonb(e)->>'duration_mode' AS duration_mode, to_jsonb(e)->>'entry_epoch_at' AS entry_epoch_at FROM trade_bitget_live_experiment e WHERE id='default'");
  const accounts = await db.mooxUnifiedLiveAccount.findMany({ where: { ownerKey: 'official' }, select: { mode: true, newEntriesEnabled: true, positionManagementEnabled: true } });
  const runtime = await db.$queryRawUnsafe("SELECT paused, last_heartbeat_at, run_lock_until, (run_lock_owner IS NOT NULL) AS has_lock_owner FROM trade_bitget_runtime_state WHERE id='default'");
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), columns, lifecycle, accounts, runtime }, null, 2));
}
main().catch(e => { console.error('DURATION_RELEASE_CHECK_FAILED', e.code || e.name); process.exitCode = 1; }).finally(() => db.$disconnect());
