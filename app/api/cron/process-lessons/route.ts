import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import {
  backfillMasterIntelligenceQimenLessons,
  processPendingLessons,
} from "@/lib/master-intelligence/pipeline";
import {
  backfillTeacherKnowledgeQimenLessons,
  processPendingTeacherKnowledgeLessons,
} from "@/lib/teacher-knowledge/pipeline";
import {
  acquireQimenLessonAutomationLease,
  releaseQimenLessonAutomationLease,
} from "@/lib/research/qimen-lesson-automation-lease";
import { resolveLessonProcessingProfile } from "@/lib/research/lesson-processing-schedule-core";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const maxDuration = 60;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  const requestStartedMs = Date.now();
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const leaseOwner = randomUUID();
  let leaseAcquired = false;
  try {
    leaseAcquired = await acquireQimenLessonAutomationLease({ owner: leaseOwner, ttlMs: 70_000 });
    if (!leaseAcquired) {
      return NextResponse.json({ ok: true, skipped: "QIMEN_LESSON_AUTOMATION_LEASE_HELD" });
    }
    const deadlineMs = requestStartedMs + 55_000;
    const startedAt = new Date();
    const profile = resolveLessonProcessingProfile(startedAt);
    const [masterQimenBackfill, teacherKnowledgeQimenBackfill] = await Promise.all([
      backfillMasterIntelligenceQimenLessons(profile.masterBackfillLimit, { deadlineMs }),
      backfillTeacherKnowledgeQimenLessons(profile.teacherBackfillLimit, { deadlineMs }),
    ]);
    const [masterResults, teacherKnowledgeResults] = await Promise.all([
      processPendingLessons(profile.masterPendingLimit, { deadlineMs }),
      processPendingTeacherKnowledgeLessons(profile.teacherPendingLimit, { deadlineMs }),
    ]);
    return NextResponse.json({
      ok: true,
      mode: profile.mode,
      startedAt: startedAt.toISOString(),
      masterQimenBackfill,
      teacherKnowledgeQimenBackfill,
      results: masterResults,
      teacherKnowledgeResults,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "cron failed" },
      { status: 500 }
    );
  } finally {
    if (leaseAcquired) await releaseQimenLessonAutomationLease(leaseOwner).catch(() => undefined);
  }
}
