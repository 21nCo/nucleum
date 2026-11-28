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
import ts from "typescript";

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

/**
 * Returns the patched bundle source, or throws if the bundle does not have the
 * expected shape. The chain is resolved on the parsed bundle, starting from the
 * exported Lambda handler: `handler:()=>H`; H returns a call `L(e,W,!1)`; W is
 * `async function W(e){return R(e,p,d)}`; R reads `e.state.split(":")[1]` and
 * awaits the sign-in step S exactly once with its own arguments. Each name must
 * be declared by exactly one function in the bundle.
 */
export function patchBundle(source, moduleSource) {
  if (source.includes(GLOBAL_NAME)) {
    throw new Error("bundle is already patched");
  }
  const file = ts.createSourceFile(
    "oauthRedirect.js",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
  const functions = new Map();
  const handlers = [];
  visit(file, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const list = functions.get(node.name.text) ?? [];
      list.push(node);
      functions.set(node.name.text, list);
    }
    if (
      ts.isPropertyAssignment(node) &&
      propertyName(node) === "handler" &&
      ts.isArrowFunction(node.initializer) &&
      ts.isIdentifier(node.initializer.body)
    ) {
      handlers.push(node.initializer.body.text);
    }
  });
  const fn = (name, what) => {
    const list = functions.get(name) ?? [];
    if (list.length !== 1) {
      throw new Error(`expected one function ${name} (${what}), found ${list.length}`);
    }
    return list[0];
  };

  if (handlers.length !== 1) {
    throw new Error(`expected one exported Lambda handler, found ${handlers.length}`);
  }
  const handler = fn(handlers[0], "Lambda handler");
  const [event] = paramNames(handler, 1, "Lambda handler");
  const dispatches = callsIn(handler.body, (call) => {
    const [a, b, c] = call.arguments;
    return (
      call.arguments.length === 3 &&
      isIdentifier(a, event) &&
      ts.isIdentifier(b) &&
      isFalse(c)
    );
  });
  if (dispatches.length !== 1) {
    throw new Error(`expected one unauthenticated dispatch in ${handlers[0]}, found ${dispatches.length}`);
  }
  const callbackName = dispatches[0].arguments[1].text;

  const wrapper = fn(callbackName, "wrapper");
  const [wrapperEvent] = paramNames(wrapper, 1, "wrapper");
  const statements = wrapper.body?.statements ?? [];
  const returned = statements.length === 1 && ts.isReturnStatement(statements[0])
    ? statements[0].expression
    : undefined;
  if (
    !returned ||
    !ts.isCallExpression(returned) ||
    !ts.isIdentifier(returned.expression) ||
    returned.arguments.length !== 3 ||
    !isIdentifier(returned.arguments[0], wrapperEvent) ||
    !returned.arguments.slice(1).every((arg) => ts.isIdentifier(arg))
  ) {
    throw new Error(`wrapper ${callbackName} does not return R(e,p,d)`);
  }
  const redirectName = returned.expression.text;
  const [providerVar, endpointVar] = returned.arguments.slice(1).map((arg) => arg.text);

  const redirect = fn(redirectName, "redirect handler");
  const redirectParams = paramNames(redirect, 3, "redirect handler");
  if (!redirect.body.getText(file).includes(`${redirectParams[0]}.state.split(":")[1]`)) {
    throw new Error(`${redirectName} is not the OAuth redirect handler`);
  }
  const signIns = [];
  visit(redirect.body, (node) => {
    if (
      ts.isAwaitExpression(node) &&
      ts.isCallExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.arguments.length === 3 &&
      node.expression.arguments.every((arg, i) => isIdentifier(arg, redirectParams[i]))
    ) {
      signIns.push(node.expression.expression.text);
    }
  });
  if (signIns.length !== 1) {
    throw new Error(`expected one sign-in call in ${redirectName}, found ${signIns.length}`);
  }
  const signIn = signIns[0];
  fn(signIn, "sign-in step");

  const call = `${GLOBAL_NAME}.buildOAuthRedirectResponse(${wrapperEvent},${providerVar},${endpointVar},${signIn})`;
  const start = returned.getStart(file);
  const body = source.slice(0, start) + call + source.slice(returned.end);
  if (body.split(call).length !== 2) {
    throw new Error("patched call not found exactly once");
  }
  const strict = '"use strict";';
  return body.startsWith(strict)
    ? `${strict}\n${moduleSource}\n${body.slice(strict.length)}`
    : `${moduleSource}\n${body}`;
}

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

/** Calls in `body` that match, not counting calls inside nested functions. */
function callsIn(body, matches) {
  const found = [];
  const walk = (node) => {
    if (node !== body && ts.isFunctionLike(node)) return;
    if (ts.isCallExpression(node) && matches(node)) found.push(node);
    ts.forEachChild(node, walk);
  };
  if (body) walk(body);
  return found;
}

function paramNames(node, count, what) {
  const names = node.parameters.map((param) =>
    ts.isIdentifier(param.name) ? param.name.text : undefined
  );
  if (names.length !== count || names.some((name) => !name) || !node.body) {
    throw new Error(`${what} does not take ${count} plain parameters`);
  }
  return names;
}

function propertyName(node) {
  return ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)
    ? node.name.text
    : undefined;
}

function isIdentifier(node, name) {
  return Boolean(node) && ts.isIdentifier(node) && node.text === name;
}

function isFalse(node) {
  return (
    node.kind === ts.SyntaxKind.FalseKeyword ||
    (ts.isPrefixUnaryExpression(node) &&
      node.operator === ts.SyntaxKind.ExclamationToken &&
      ts.isNumericLiteral(node.operand) &&
      node.operand.text === "1")
  );
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
