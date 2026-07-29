/**
 * Social card metadata store.
 * Primary: moonx-data/social-cards/store.json; local fallback for admin/dev.
 */
import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SocialCardRecord } from "@/types/social-card";

type SocialCardJsonStore = {
  version: 1;
  updatedAt: string;
  records: SocialCardRecord[];
};

const BUCKET = "moonx-data";
const FILE = "social-cards/store.json";
const LOCAL_FILE = resolve(process.cwd(), "data", "social-cards.json");

function emptyStore(): SocialCardJsonStore {
  return { version: 1, updatedAt: new Date().toISOString(), records: [] };
}

function readLocalStore(): SocialCardJsonStore | null {
  try {
    if (!existsSync(LOCAL_FILE)) return null;
    const parsed = JSON.parse(readFileSync(LOCAL_FILE, "utf8")) as SocialCardJsonStore;
    if (!parsed || !Array.isArray(parsed.records)) return null;
    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
      records: parsed.records,
    };
  } catch {
    return null;
  }
}

function writeLocalStore(store: SocialCardJsonStore): void {
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  writeFileSync(LOCAL_FILE, JSON.stringify(store, null, 2), "utf8");
}

async function readStore(): Promise<SocialCardJsonStore> {
  try {
    const admin = getAdminClient();
    if (admin) {
      const { data, error } = await admin.storage.from(BUCKET).download(FILE);
      if (!error && data) {
        const parsed = JSON.parse(await data.text()) as SocialCardJsonStore;
        if (parsed && Array.isArray(parsed.records)) {
          return {
            version: 1,
            updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
            records: parsed.records,
          };
        }
      }
    }
  } catch {
    /* fall through */
  }
  return readLocalStore() ?? emptyStore();
}

async function writeStore(store: SocialCardJsonStore): Promise<void> {
  const payload: SocialCardJsonStore = {
    version: 1,
    updatedAt: new Date().toISOString(),
    records: store.records,
  };

  let wroteRemote = false;
  try {
    const admin = getAdminClient();
    if (admin) {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const { error } = await admin.storage.from(BUCKET).upload(FILE, blob, {
        upsert: true,
        contentType: "application/json",
      });
      if (!error) wroteRemote = true;
      else console.warn("[social-cards] remote write:", error.message);
    }
  } catch (err) {
    console.warn("[social-cards] remote write failed:", err);
  }

  // Always mirror locally outside Vercel serverless read-only FS when possible.
  if (!process.env.VERCEL) {
    writeLocalStore(payload);
  } else if (!wroteRemote) {
    // Last-resort in-memory only; surface failure to caller.
    throw new Error("Unable to persist social cards (no writable store)");
  } else {
    // Best-effort local skip on Vercel
  }
}

export async function listSocialCards(): Promise<SocialCardRecord[]> {
  const store = await readStore();
  return [...store.records].sort((a, b) =>
    b.forecastDate.localeCompare(a.forecastDate) || b.updatedAt.localeCompare(a.updatedAt)
  );
}

export async function getSocialCardById(id: string): Promise<SocialCardRecord | null> {
  const store = await readStore();
  return store.records.find((r) => r.id === id) ?? null;
}

export async function listSocialCardsForDate(forecastDate: string): Promise<SocialCardRecord[]> {
  const store = await readStore();
  return store.records
    .filter((r) => r.forecastDate === forecastDate)
    .sort((a, b) => a.assetId.localeCompare(b.assetId));
}

export async function upsertSocialCards(cards: SocialCardRecord[]): Promise<SocialCardRecord[]> {
  const store = await readStore();
  const byId = new Map(store.records.map((r) => [r.id, r]));
  for (const card of cards) {
    byId.set(card.id, card);
  }
  store.records = [...byId.values()].sort(
    (a, b) => b.forecastDate.localeCompare(a.forecastDate) || b.updatedAt.localeCompare(a.updatedAt)
  );
  await writeStore(store);
  return cards;
}

export async function replaceSocialCardsForDate(
  forecastDate: string,
  cards: SocialCardRecord[]
): Promise<SocialCardRecord[]> {
  const store = await readStore();
  const kept = store.records.filter((r) => r.forecastDate !== forecastDate);
  store.records = [...cards, ...kept].sort(
    (a, b) => b.forecastDate.localeCompare(a.forecastDate) || b.updatedAt.localeCompare(a.updatedAt)
  );
  await writeStore(store);
  return cards;
}
