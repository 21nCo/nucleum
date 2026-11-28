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

const NAME = "[\\w$]+";

/**
 * Returns the patched bundle source, or throws if the bundle does not have the
 * expected shape. The chain is resolved from the exported Lambda handler:
 * `handler:()=>H`, `async function H(e){... return L(e,W,!1)}`,
 * `async function W(e){return R(e,p,d)}`, and R is the redirect handler that
 * reads the state and awaits the sign-in step S once.
 */
export function patchBundle(source, moduleSource) {
  if (source.includes(GLOBAL_NAME)) {
    throw new Error("bundle is already patched");
  }
  const handler = only(
    source,
    new RegExp(`handler:\\(\\)=>(${NAME})`, "g"),
    "exported Lambda handler"
  )[1];
  const handlerSource = functionSource(source, `async function ${handler}(e){`);
  const callback = only(
    handlerSource,
    new RegExp(`(${NAME})\\(e,(${NAME}),!1\\)`, "g"),
    `unauthenticated callback in ${handler}`
  )[2];
  const wrapperMatch = only(
    source,
    new RegExp(
      `async function ${escape(callback)}\\(e\\)\\{return (${NAME})\\(e,(${NAME}),(${NAME})\\);?\\}`,
      "g"
    ),
    `wrapper ${callback}`
  );
  const [wrapper, redirectHandler, providerVar, endpointVar] = wrapperMatch;
  const redirectSource = functionSource(
    source,
    `async function ${redirectHandler}(e,t,r){`
  );
  if (!redirectSource.includes('e.state.split(":")[1]')) {
    throw new Error(`${redirectHandler} is not the OAuth redirect handler`);
  }
  const signIn = only(
    redirectSource,
    new RegExp(`await (${NAME})\\(e,t,r\\)`, "g"),
    `sign-in call in ${redirectHandler}`
  )[1];
  functionSource(source, `async function ${signIn}(e,t,r){`);

  const call = `${GLOBAL_NAME}.buildOAuthRedirectResponse(e,${providerVar},${endpointVar},${signIn})`;
  const patchedWrapper = `async function ${callback}(e){return ${call}}`;
  const at = wrapperMatch.index;
  const body = source.slice(0, at) + patchedWrapper + source.slice(at + wrapper.length);
  if (body.split(call).length !== 2) {
    throw new Error("patched call not found exactly once");
  }
  const strict = '"use strict";';
  return body.startsWith(strict)
    ? `${strict}\n${moduleSource}\n${body.slice(strict.length)}`
    : `${moduleSource}\n${body}`;
}

function only(source, pattern, what) {
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`expected one ${what}, found ${matches.length}`);
  }
  return matches[0];
}

/** Source of the function that starts with `prefix`, up to the next function. */
function functionSource(source, prefix) {
  const starts = source.split(prefix).length - 1;
  if (starts !== 1) {
    throw new Error(`expected one ${prefix}, found ${starts}`);
  }
  const start = source.indexOf(prefix);
  const next = source.indexOf("function ", start + prefix.length);
  return source.slice(start, next < 0 ? undefined : next);
}

function escape(name) {
  return name.replace(/\$/g, "\\$");
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
