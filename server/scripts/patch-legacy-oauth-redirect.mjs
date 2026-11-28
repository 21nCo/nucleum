#!/usr/bin/env node
/**
 * Applies the legacy OAuth redirect allowlist (server/common/oauth/oauth-redirect.ts)
 * to an already-built legacy `oauthRedirect.js` Lambda bundle.
 *
 * The legacy Lambda bundles were built outside this repository, so the fix is
 * compiled from source here and spliced into the deployed bundle: the module is
 * prepended as `__legacyOAuthRedirect`, and the handler wrapper is pointed at
 * `buildOAuthRedirectResponse`, passing the bundle's own
 * `processOAuthRedirection` as the sign-in step. Nothing else in the bundle changes.
 *
 * Usage: node server/scripts/patch-legacy-oauth-redirect.mjs <in oauthRedirect.js> <out oauthRedirect.js>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";

const GLOBAL_NAME = "__legacyOAuthRedirect";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function compileRedirectModule() {
  const result = await build({
    entryPoints: [path.join(repoRoot, "server/common/oauth/oauth-redirect.ts")],
    bundle: true,
    write: false,
    format: "iife",
    globalName: GLOBAL_NAME,
    platform: "node",
    target: "node20"
  });
  return result.outputFiles[0].text;
}

/** Returns the patched bundle source, or throws if the bundle does not have the expected shape. */
export function patchBundle(source, moduleSource) {
  if (source.includes(GLOBAL_NAME)) {
    throw new Error("bundle is already patched");
  }
  // Wrapper: async function pYe(e){return ane(e,ev,hO)}
  const wrappers = [
    ...source.matchAll(
      /async function ([\w$]+)\(e\)\{return ([\w$]+)\(e,([\w$]+),([\w$]+)\)\}/g
    )
  ].filter((m) =>
    source.includes(`async function ${m[2]}(e,t,r){`) &&
    handlerBody(source, m[2]).includes('e.state.split(":")[1]')
  );
  if (wrappers.length !== 1) {
    throw new Error(`expected one redirect handler wrapper, found ${wrappers.length}`);
  }
  const [wrapper, , handler, providerVar, endpointVar] = wrappers[0];
  const signIns = [...handlerBody(source, handler).matchAll(/await ([\w$]+)\(e,t,r\)/g)];
  if (signIns.length !== 1) {
    throw new Error(`expected one sign-in call in ${handler}, found ${signIns.length}`);
  }
  const signIn = signIns[0][1];
  if (!source.includes(`async function ${signIn}(e,t,r){`)) {
    throw new Error(`sign-in function ${signIn} not found`);
  }
  const patchedWrapper = wrapper.replace(
    `return ${handler}(e,${providerVar},${endpointVar})`,
    `return ${GLOBAL_NAME}.buildOAuthRedirectResponse(e,${providerVar},${endpointVar},${signIn})`
  );
  const body = source.replace(wrapper, patchedWrapper);
  const strict = body.startsWith('"use strict";') ? '"use strict";\n' : "";
  return strict + moduleSource + "\n" + body.slice(strict ? '"use strict";'.length : 0);
}

function handlerBody(source, name) {
  const start = source.indexOf(`async function ${name}(e,t,r){`);
  if (start < 0) return "";
  const next = source.indexOf("async function ", start + 1);
  return source.slice(start, next < 0 ? undefined : next);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error("usage: patch-legacy-oauth-redirect.mjs <in oauthRedirect.js> <out oauthRedirect.js>");
    process.exit(2);
  }
  const patched = patchBundle(fs.readFileSync(input, "utf8"), await compileRedirectModule());
  fs.writeFileSync(output, patched);
  const check = spawnSync(process.execPath, ["--check", output], { stdio: "inherit" });
  if (check.status !== 0) process.exit(check.status ?? 1);
  console.log(`patched ${output}`);
}
