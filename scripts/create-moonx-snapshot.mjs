/**
 * npm run moonx:snapshot
 *
 * 1. Validates content/moonx/latest.json
 * 2. Copies it to content/moonx/history/<version>.json
 * 3. Refuses to overwrite an existing snapshot
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const latestPath = path.join(root, "content", "moonx", "latest.json");
const historyDir = path.join(root, "content", "moonx", "history");

function fail(message) {
  console.error(`\n✕ ${message}\n`);
  process.exit(1);
}

async function main() {
  // Re-run the validate script first for human-readable output.
  const validate = spawnSync(process.execPath, [path.join(__dirname, "validate-moonx-data.mjs")], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (validate.status !== 0) {
    fail("Snapshot aborted — fix validation errors first.");
  }

  if (!existsSync(latestPath)) fail("content/moonx/latest.json not found.");

  let doc;
  try {
    doc = JSON.parse(readFileSync(latestPath, "utf8"));
  } catch (error) {
    fail(`Invalid JSON: ${error.message}`);
  }

  const version = doc.version || doc.snapshotId;
  if (!version || typeof version !== "string") {
    fail('latest.json must include a string "version" (or snapshotId) field.');
  }

  mkdirSync(historyDir, { recursive: true });
  const dest = path.join(historyDir, `${version}.json`);

  if (existsSync(dest)) {
    fail(`Snapshot already exists and will not be overwritten:\n  ${path.relative(root, dest)}\nBump "version" in latest.json before creating a new snapshot.`);
  }

  // Double-check schema via the TS parser.
  const { parseMoonXDocument } = await import(pathToFileURL(path.join(root, "lib/moonx/load-research.ts")).href);
  const parsed = parseMoonXDocument(doc);
  if (!parsed.ok) {
    fail(`Schema validation failed:\n${(parsed.error.issues ?? []).map((i) => `  - ${i}`).join("\n")}`);
  }

  copyFileSync(latestPath, dest);
  // Touch a tiny provenance note into the copy is not needed — binary-identical is fine.
  const written = readFileSync(dest, "utf8");
  if (written !== readFileSync(latestPath, "utf8")) {
    fail("Snapshot copy mismatch — aborting.");
  }

  // Ensure the file is valid JSON after write (paranoia).
  writeFileSync(dest, `${JSON.stringify(JSON.parse(written), null, 2)}\n`, "utf8");

  console.log("\n✓ MoonX snapshot created\n");
  console.log(`  Saved: ${path.relative(root, dest)}`);
  console.log(`  Version: ${version}`);
  console.log("");
}

main().catch((error) => fail(error?.stack || String(error)));
