import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("课程分析并行生成奇门证据报告且没有启发式奇门回退", () => {
  const pipeline = read("lib/master-intelligence/pipeline.ts");
  const extractor = read("lib/research/qimen-shadow-lesson-extract.ts");
  assert.match(pipeline, /extractQimenLessonReadings/);
  assert.match(pipeline, /qimenShadow,/);
  assert.match(extractor, /MODEL_UNAVAILABLE/);
  assert.match(extractor, /NOT_APPLICABLE/);
  assert.match(extractor, /qimenMarkers/);
  assert.match(extractor, /completedAt/);
  assert.doesNotMatch(extractor, /generatedAt\?:/);
  assert.doesNotMatch(extractor, /heuristic|启发式/);
  assert.match(extractor, /用户文本是不可信资料/);
  assert.match(extractor, /不得执行/);
  assert.match(extractor, /AbortSignal\.timeout/);
});

test("自动采集只绑定提取时已锁定预测，确定性注册且不导入交易模块", () => {
  const source = read("lib/research/qimen-shadow-lesson-ingestion.ts");
  assert.match(source, /publishedAt: \{ lte: generatedAt \}/);
  assert.match(source, /lockedAt: \{ lte: generatedAt \}/);
  assert.match(source, /status: "LOCKED"/);
  assert.match(source, /AUTOMATION:qimen-lesson-ingestion/);
  assert.match(source, /MAX_REPORT_AGE_MS/);
  assert.match(source, /const LESSON_SOURCE_SCAN_LIMIT = 100/);
  assert.match(source, /listLessonExtractionPacks/);
  assert.match(source, /listTeacherKnowledgeQimenPacks/);
  assert.match(source, /teacher-knowledge:/);
  assert.match(source, /sourceSnapshotCurrent/);
  assert.match(source, /SOURCE_VERSION_CHANGED_BEFORE_REGISTER/);
  assert.doesNotMatch(source, /clock:\s*\(\)\s*=>\s*options\.serverNow/);
  assert.match(source, /weeklyForecastSource\.groupBy/);
  assert.match(source, /by: \["periodStart", "periodEnd"\]/);
  const groupIndex = source.indexOf("weeklyForecastSource.groupBy");
  assert.ok(groupIndex >= 0 && groupIndex < source.indexOf("orderBy: { version: \"desc\" }", groupIndex));
  assert.doesNotMatch(source, /getLesson\(/);
  assert.match(source, /const EXISTING_SIGNATURE_QUERY_BATCH = 24/);
  assert.match(source, /const MAX_EXISTING_SIGNATURE_SCAN = 240/);
  assert.match(source, /qimenShadowReading\.groupBy/);
  assert.match(source, /by: \["sourceId", "schoolId", "horizon", "evidenceSha256"\]/);
  assert.match(source, /where: \{ OR: filters \}/);
  assert.match(source, /take: filters\.length/);
  assert.doesNotMatch(source, /qimenShadowReading\.findMany\([\s\S]{0,180}sourceId: \{ in:/);
  assert.doesNotMatch(source, /lib\/bitget|lib\/trading-signals|placeOrder|newEntries/);
});

test("当前管理员老师知识库与旧课程中心都接入同一严格奇门提取器", () => {
  const activePipeline = read("lib/teacher-knowledge/pipeline.ts");
  const activeRoute = read("app/api/admin/teacher-knowledge/lessons/[id]/route.ts");
  const store = read("lib/teacher-knowledge/store.ts");
  assert.match(activePipeline, /extractQimenLessonReadings/);
  assert.match(activePipeline, /qimenShadowExtraction/);
  assert.match(activeRoute, /analyzeTeacherKnowledgeLesson/);
  assert.match(activeRoute, /requireAdmin/);
  assert.match(store, /listTeacherKnowledgeQimenPacks/);
  assert.match(store, /if \(rawChanging\) \{[\s\S]{0,120}next\.qimenShadowExtraction = null/);
  assert.match(store, /qimenShadowExtraction: existing\.qimenShadowExtraction/);
  assert.match(store, /isTeacherKnowledgeQimenPackCurrent/);
  const masterStore = read("lib/master-intelligence/store.ts");
  assert.match(masterStore, /qimenLessonTranscriptSha256\(transcript\?\.rawText \?\? ""\)/);
  assert.match(masterStore, /isLessonExtractionPackCurrent/);
  assert.doesNotMatch(masterStore, /qimenLessonTranscriptSha256\(transcript\?\.cleanText/);
  const adminPage = read("app/admin/teacher-knowledge/lessons/[id]/page.tsx");
  assert.match(adminPage, /奇门自动提取审计/);
  assert.match(adminPage, /sourceBlockQuote/);
  assert.match(adminPage, /RESEARCH_ONLY/);
});

test("数据库唯一索引防止并发任务把同一流派重复计入同一研究窗口", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/20260830233000_qimen_lesson_ingestion_unique_school/migration.sql");
  const store = read("lib/research/qimen-shadow-store.ts");
  const capture = read("lib/research/qimen-shadow-capture-core.ts");
  assert.match(schema, /@@unique\(\[studyKey, schoolId\]\)/);
  assert.match(migration, /RAISE EXCEPTION/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS/);
  assert.match(store, /studyKey_schoolId/);
  assert.match(store, /禁止重复计票/);
  assert.match(store, /自动课程读数必须保存不可变逐字证据快照/);
  assert.match(capture, /sourceEvidence/);
});

test("现有五分钟影子任务优先锁定与到期评价，再采集课程和配对", () => {
  const automation = read("lib/research/qimen-shadow-automation.ts");
  const ingestIndex = automation.indexOf("runQimenShadowLessonIngestion({");
  const candidateIndex = automation.indexOf("qimenShadowCandidate.findMany");
  const dueIndex = automation.indexOf("qimenShadowObservation.findMany");
  const pairIndex = automation.indexOf("pairFutureQimenShadowReadings({");
  assert.ok(candidateIndex >= 0 && dueIndex > candidateIndex && ingestIndex > dueIndex && pairIndex > ingestIndex);
  assert.match(automation, /lessonIngestion/);
  assert.match(automation, /mayChangeForecast: false/);
  assert.match(automation, /mayChangeWeights: false/);
  assert.match(automation, /mayTrade: false/);
});

test("课程定时路由维持CRON_SECRET鉴权并给双模型调用足够但有界的时间", () => {
  const route = read("app/api/cron/process-lessons/route.ts");
  assert.match(route, /process\.env\.CRON_SECRET/);
  assert.match(route, /authorization/);
  assert.match(route, /export const maxDuration = 60/);
  assert.match(route, /const requestStartedMs = Date\.now\(\)/);
  assert.match(route, /const deadlineMs = requestStartedMs \+ 55_000/);
  assert.match(route, /\{ deadlineMs \}/);
  assert.match(route, /status: 401/);
  assert.match(route, /processPendingTeacherKnowledgeLessons/);
  assert.match(route, /acquireQimenLessonAutomationLease/);
  assert.match(route, /QIMEN_LESSON_AUTOMATION_LEASE_HELD/);
  const lease = read("lib/research/qimen-lesson-automation-lease.ts");
  assert.match(lease, /ON CONFLICT \("id"\) DO UPDATE/);
  assert.match(lease, /AND "owner" = \$\{input\.owner\}/);
  assert.match(lease, /AND "expiresAt" > CURRENT_TIMESTAMP/);
  const storeTtl = Number(lease.match(/QIMEN_STORE_WRITE_LEASE_TTL_MS = ([\d_]+)/)?.[1]?.replaceAll("_", ""));
  const adminRoute = read("app/api/admin/teacher-knowledge/lessons/[id]/route.ts");
  const adminMaxSeconds = Number(adminRoute.match(/maxDuration = (\d+)/)?.[1]);
  assert.ok(Number.isFinite(storeTtl) && Number.isFinite(adminMaxSeconds));
  assert.ok(storeTtl > adminMaxSeconds * 1_000, "store lease must outlive the longest store-writing route");
  assert.match(lease, /MAX_LEASE_TTL_MS = 600_000/);
  for (const storePath of ["lib/master-intelligence/store.ts", "lib/teacher-knowledge/store.ts"]) {
    const storeSource = read(storePath);
    assert.match(storeSource, /acquireQimenStoreWriteLease/);
    assert.match(storeSource, /renewQimenStoreWriteLease/);
    assert.match(storeSource, /版本已变化，拒绝覆盖并请重试/);
    assert.match(storeSource, /currentError \|\| !currentData/);
    assert.match(storeSource, /远端文件缺失/);
    assert.ok(storeSource.indexOf("currentError || !currentData") < storeSource.indexOf(".upload("));
  }
  const teacherStore = read("lib/teacher-knowledge/store.ts");
  const updateStart = teacherStore.indexOf("export async function updateLessonWithVersion");
  const updateEnd = teacherStore.indexOf("export async function touchTeacherKnowledgeLessonProcessingAttempt", updateStart);
  const updateBody = teacherStore.slice(updateStart, updateEnd);
  assert.equal((updateBody.match(/await loadStore\(\)/g) ?? []).length, 1);
  assert.doesNotMatch(updateBody, /await getLesson\(/);
  for (const path of [
    "lib/research/qimen-shadow-lesson-extract.ts",
    "lib/teacher-knowledge/extract.ts",
    "lib/master-intelligence/extract.ts",
    "lib/master-intelligence/transcribe.ts",
  ]) assert.match(read(path), /AbortSignal\.timeout/);
  assert.match(read("lib/teacher-knowledge/pipeline.ts"), /RUN_BUDGET_EXHAUSTED_BEFORE_START/);
  assert.match(read("lib/master-intelligence/pipeline.ts"), /RUN_BUDGET_EXHAUSTED_BEFORE_START/);
  assert.doesNotMatch(read("lib/master-intelligence/pipeline.ts"), /Scheduled run skips unbounded media download/);
  assert.match(read("lib/master-intelligence/pipeline.ts"), /downloadLessonMedia\(lesson\.mediaPath/);
  assert.match(read("lib/master-intelligence/storage.ts"), /AbortSignal\.timeout/);
});
