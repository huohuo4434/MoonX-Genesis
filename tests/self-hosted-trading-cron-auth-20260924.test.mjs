import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

// Includes the trading watchdog: denied requests must never invoke custody logic.
const routes = ['content-freshness','external-analysts','generate-daily-forecasts','moonx-cycle','prepare-focus-week','sync-verification','trading-watchdog','vibe-refresh','verify-weekly','verify-daily-late'];
const secret = 'test-only-cron-key';
function load(name, env) {
  const source = readFileSync(new URL(`../app/api/cron/${name}/route.ts`, import.meta.url), 'utf8');
  const ast = ts.createSourceFile('route.ts', source, ts.ScriptTarget.Latest, true);
  const guard = ast.statements.find(n => ts.isFunctionDeclaration(n) && /^(authorizeCron|authorized)$/.test(n.name?.text ?? ''));
  assert.ok(guard, `guard missing: ${name}`);
  const effects = [];
  const sandbox = {
    exports: {}, process: { env }, Response, console: { error() {} },
    require(id) {
      if (id === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      // Never import real application code: no database, exchange, or network access.
      return new Proxy({}, { get: (_, key) => (...args) => { effects.push({ id, key, args }); return {}; } });
    },
  };
  const options = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: options }).outputText, sandbox);
  vm.runInNewContext(ts.transpileModule(`${guard.getText(ast)}\nexports.guard = ${guard.name.text};`, { compilerOptions: options }).outputText, sandbox);
  return { ...sandbox.exports, effects };
}
function request(headers = {}, suffix = '') {
  return { headers: new Headers(headers), nextUrl: new URL(`https://isolated.invalid/api/cron/example${suffix}`) };
}

for (const name of routes) {
  test(`${name}: no key fails closed on VPS, Vercel and local environments`, async () => {
    for (const VERCEL of [undefined, '0', '1']) for (const CRON_SECRET of [undefined, '', '   ']) {
      const route = load(name, { VERCEL, CRON_SECRET, NODE_ENV: 'production' });
      for (const req of [request(), request({ 'user-agent': 'vercel-cron/1.0' }), request({authorization:'Bearer undefined'}, '?secret=undefined')]) {
        assert.equal(route.guard(req), false);
        for (const method of ['GET', 'POST']) if (route[method]) {
          const result = await route[method](req);
          assert.equal(result.status, 401, `${name}/${method}`);
        }
      }
      assert.equal(route.effects.length, 0, 'denied requests must not reach business logic');
    }
  });
  test(`${name}: configured Bearer remains valid, spoofed UA/query cannot substitute`, async () => {
    const route = load(name, { CRON_SECRET: secret, NODE_ENV: 'production' });
    assert.equal(route.guard(request({authorization:`Bearer ${secret}`})), true);
    for (const req of [request(), request({'user-agent':'vercel-cron/1.0'},`?secret=${secret}`), request({authorization:'Bearer wrong'})]) {
      assert.equal(route.guard(req), false);
      for (const method of ['GET', 'POST']) if (route[method]) assert.equal((await route[method](req)).status, 401);
    }
    assert.equal(route.effects.length, 0);
  });
}
