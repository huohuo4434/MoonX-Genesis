import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const target = process.argv[2];

if (!target) {
  console.error(JSON.stringify({ ok: false, error: "missing target path" }));
  process.exit(1);
}

const absolute = resolve(process.cwd(), target);
if (!existsSync(absolute)) {
  console.log(JSON.stringify({ ok: true, skipped: true, reason: `missing ${target}` }));
  process.exit(0);
}

execFileSync(process.execPath, ["--import", "tsx", target], { stdio: "inherit" });
