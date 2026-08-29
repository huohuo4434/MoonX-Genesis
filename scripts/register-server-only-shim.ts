import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Module = require("node:module") as typeof import("node:module") & {
  _resolveFilename: (request: string, parent: unknown, isMain: boolean, options: unknown) => string;
};

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request: string, parent: unknown, isMain: boolean, options: unknown) {
  if (request === "server-only") {
    return require.resolve("./shims/server-only.ts");
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
