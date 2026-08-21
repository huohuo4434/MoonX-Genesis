import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
// @ts-expect-error Download artifact intentionally has no declaration file.
import { assertPermissionSafety, parseLocalConfig, requireIpWhitelist } from "../private-assets/member-trading/moox-bitget-local-agent.mjs";

const zipPath = "private-assets/member-trading/MOOX-Bitget-Windows.zip";
const packageDir = "private-assets/member-trading/windows-package";

test("native Chinese config parser is allowlisted, deterministic and never needs dotenv", () => {
  assert.deepEqual(parseLocalConfig("# 注释\nMOOX_SIGNAL_TOKEN=mxm_test\nMOOX_AGENT_MODE=PAPER\nBITGET_API_SECRET=a#b=c\n"), {
    MOOX_SIGNAL_TOKEN: "mxm_test", MOOX_AGENT_MODE: "PAPER", BITGET_API_SECRET: "a#b=c",
  });
  assert.throws(() => parseLocalConfig("UNKNOWN_SECRET=value"), /不支持的名称/);
  assert.throws(() => parseLocalConfig("MOOX_BASE_URL=https://evil.example"), /不支持的名称/);
  assert.throws(() => parseLocalConfig("MOOX_AGENT_MODE=PAPER\nMOOX_AGENT_MODE=LIVE"), /重复填写/);
  const agent = readFileSync("private-assets/member-trading/moox-bitget-local-agent.mjs", "utf8");
  assert.match(agent, /MOOX配置\.txt/);
  assert.match(agent, /const MOOX_PLAN_ORIGIN = "https:\/\/mooxintel\.com"/);
  assert.doesNotMatch(agent, /process\.env\.MOOX_BASE_URL/);
  assert.match(agent, /redirect: "error"/);
  assert.doesNotMatch(agent, /dotenv|console\.log\([^\n]*(?:BITGET_API_SECRET|BITGET_API_PASSPHRASE)/i);
});

test("member can choose an IP whitelist policy without weakening permission checks", () => {
  const safe = { permissions: ["uta_mgt", "uta_trade"], permType: "read-and-write", ips: "" };
  assert.equal(requireIpWhitelist({}), true);
  assert.equal(requireIpWhitelist({ MOOX_REQUIRE_IP_WHITELIST: "false" }), false);
  assert.throws(() => requireIpWhitelist({ MOOX_REQUIRE_IP_WHITELIST: "maybe" }), /只能是 true 或 false/);
  assert.throws(() => assertPermissionSafety(safe, "LIVE", { MOOX_REQUIRE_IP_WHITELIST: "true" }), /强制IP白名单/);
  assert.throws(() => assertPermissionSafety(safe, "DRY_RUN", { MOOX_REQUIRE_IP_WHITELIST: "true" }), /强制IP白名单/);
  assert.equal(assertPermissionSafety(safe, "DRY_RUN", { MOOX_REQUIRE_IP_WHITELIST: "false" }), true);
  assert.equal(assertPermissionSafety(safe, "LIVE", { MOOX_REQUIRE_IP_WHITELIST: "false" }), true);
  assert.throws(() => assertPermissionSafety({ ...safe, permissions: ["uta_mgt", "uta_trade", "withdraw"] }, "LIVE", { MOOX_REQUIRE_IP_WHITELIST: "false" }), /禁止权限/);
});

test("Windows ZIP contains novice launchers and no embedded member token", () => {
  const temp = mkdtempSync(join(tmpdir(), "moox-win-package-"));
  try {
    execFileSync("tar", ["-xf", zipPath, "-C", temp]);
    const names = readdirSync(temp).sort();
    for (const expected of ["moox-bitget-local-agent.mjs", "MOOX配置.txt", "1-启动PAPER.bat", "2-检查DRY_RUN.bat", "3-停止新增交易.bat", "README-先看我.txt"]) {
      assert.ok(names.includes(expected), `${expected}: ${names.join(",")}`);
    }
    const config = readFileSync(join(temp, "MOOX配置.txt"), "utf8");
    assert.match(config, /^MOOX_SIGNAL_TOKEN=\s*$/m);
    assert.doesNotMatch(config, /mxm_[A-Za-z0-9_-]{20,}/);
    assert.match(config, /^MOOX_AGENT_MODE=PAPER$/m);
    assert.match(config, /^MOOX_ENABLE_LIVE=false$/m);
    assert.match(config, /^MOOX_REQUIRE_IP_WHITELIST=true$/m);
    const selfTest = execFileSync(process.execPath, [join(temp, "moox-bitget-local-agent.mjs"), "--self-test"], { encoding: "utf8" });
    assert.match(selfTest, /"defaultMode":"PAPER"/);
    const env = { ...process.env };
    delete env.MOOX_SIGNAL_TOKEN;
    delete env.MOOX_AGENT_MODE;
    const missing = spawnSync(process.execPath, [join(temp, "moox-bitget-local-agent.mjs")], { encoding: "utf8", env });
    assert.notEqual(missing.status, 0);
    const missingOutput = `${missing.stdout}${missing.stderr}`;
    assert.match(missingOutput, /缺少 MOOX_SIGNAL_TOKEN/);
    assert.match(missingOutput, /打开Agent同目录的“MOOX配置\.txt”/);
    assert.match(missingOutput, /粘贴到 MOOX_SIGNAL_TOKEN= 的等号右边/);
    const launcher = spawnSync("cmd.exe", ["/d", "/c", "echo.|call 1-启动PAPER.bat"], { cwd: temp, encoding: "utf8", env });
    const launcherOutput = `${launcher.stdout}${launcher.stderr}`;
    assert.equal(launcher.status, 1, launcherOutput);
    assert.doesNotMatch(launcherOutput, /not recognized as an internal or external command/i);
    assert.doesNotMatch(launcherOutput, /BITGET_API_SECRET\s*=|BITGET_API_PASSPHRASE\s*=/i);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("launchers are double-click safe and cannot implicitly enable LIVE", () => {
  const paper = readFileSync(join(packageDir, "1-启动PAPER.bat"), "utf8");
  const dry = readFileSync(join(packageDir, "2-检查DRY_RUN.bat"), "utf8");
  const stop = readFileSync(join(packageDir, "3-停止新增交易.bat"), "utf8");
  const readme = readFileSync(join(packageDir, "README-先看我.txt"), "utf8");
  assert.match(paper, /MOOX_AGENT_MODE=PAPER/);
  assert.match(dry, /MOOX_AGENT_MODE=DRY_RUN/);
  assert.match(stop, /MOOX_AGENT_STOP/);
  for (const source of [paper, dry, stop]) {
    assert.ok([...Buffer.from(source, "utf8")].every((byte) => byte < 128), "BAT contents must remain ASCII for cmd.exe");
    assert.doesNotMatch(source, /MOOX_AGENT_MODE=LIVE|MOOX_ENABLE_LIVE=true|I_ACCEPT_LOCAL_LIVE_RISK/);
    assert.doesNotMatch(source, /BITGET_API_(?:KEY|SECRET|PASSPHRASE)\s*=/);
  }
  assert.match(readme, /本包没有LIVE启动按钮/);
  assert.match(readme, /Token不会预装在ZIP里/);
});

test("member UI leads with ZIP and simple 1-2-3 while keeping advanced files folded", () => {
  const ui = readFileSync("components/member/MemberTradingOnboarding.tsx", "utf8");
  assert.match(ui, /\/api\/v1\/member\/trading\/artifacts\/windows/);
  assert.match(ui, /下载Windows一键包（推荐）/);
  for (const phrase of ["1. 下载并解压ZIP", "2. 创建Token并粘贴", "3. 双击启动PAPER", "本包没有LIVE按钮", "高级用户：单独下载原始文件"]) assert.ok(ui.includes(phrase), phrase);
  assert.ok(ui.indexOf("artifacts/windows") < ui.indexOf("artifacts/agent"));
  assert.match(ui, /<details/);
  for (const phrase of ["IP 白名单开关", "绑定固定公网 IP（推荐）", "不绑定 IP（动态网络）", "MOOX_REQUIRE_IP_WHITELIST="]) assert.ok(ui.includes(phrase), phrase);
});
