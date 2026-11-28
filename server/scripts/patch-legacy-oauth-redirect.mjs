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
 * The script then loads the patched bundle and calls its exported handler with
 * a forged and a legitimate state (no code, so nothing signs in), and refuses
 * the result unless the forged host is refused and the legitimate one works.
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
 * exported Lambda handler: `handler:()=>H`; H's only return statement ends in
 * the call `L(e,W,!1)` (the last operand of a comma expression); W is
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
  const bindings = new Map();
  const assigned = new Set();
  const handlers = [];
  visit(file, (node) => {
    const bound = bindingName(node);
    if (bound) bindings.set(bound, (bindings.get(bound) ?? 0) + 1);
    const target = assignedName(node);
    if (target) assigned.add(target);
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
  const dispatch = returnedCall(handler);
  if (
    !dispatch ||
    dispatch.arguments.length !== 3 ||
    !isIdentifier(dispatch.arguments[0], event) ||
    !ts.isIdentifier(dispatch.arguments[1]) ||
    !isFalse(dispatch.arguments[2])
  ) {
    throw new Error(`${handlers[0]} does not return an unauthenticated dispatch L(e,W,!1)`);
  }
  const callbackName = dispatch.arguments[1].text;

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

  // Every name in the chain must be bound once in the whole bundle, so no
  // scope can shadow it, and the functions must never be reassigned.
  for (const name of [handlers[0], callbackName, redirectName, signIn, providerVar, endpointVar]) {
    if (bindings.get(name) !== 1) {
      throw new Error(`${name} is bound ${bindings.get(name) ?? 0} times; expected once`);
    }
  }
  for (const name of [handlers[0], callbackName, redirectName, signIn]) {
    if (assigned.has(name)) {
      throw new Error(`${name} is reassigned`);
    }
  }

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

/**
 * The call whose result a function returns: its body must have exactly one
 * return statement (outside nested functions), as its last statement, and the
 * returned expression (or the last operand of a comma expression) must be a call.
 */
function returnedCall(node) {
  const returns = [];
  const walk = (child) => {
    if (child !== node.body && ts.isFunctionLike(child)) return;
    if (ts.isReturnStatement(child)) returns.push(child);
    ts.forEachChild(child, walk);
  };
  walk(node.body);
  const statements = node.body.statements;
  if (returns.length !== 1 || statements[statements.length - 1] !== returns[0]) {
    return undefined;
  }
  let expression = returns[0].expression;
  while (expression && ts.isParenthesizedExpression(expression)) {
    expression = expression.expression;
  }
  while (
    expression &&
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.CommaToken
  ) {
    expression = expression.right;
  }
  return expression && ts.isCallExpression(expression) ? expression : undefined;
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

/** The name a declaration binds: functions, classes, variables, parameters and catch clauses. */
function bindingName(node) {
  if (
    (ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isClassDeclaration(node) ||
      ts.isClassExpression(node) ||
      ts.isVariableDeclaration(node) ||
      ts.isParameter(node) ||
      ts.isBindingElement(node) ||
      ts.isImportSpecifier(node) ||
      ts.isImportClause(node) ||
      ts.isNamespaceImport(node)) &&
    node.name &&
    ts.isIdentifier(node.name)
  ) {
    return node.name.text;
  }
  return undefined;
}

/** The identifier an assignment or update expression writes to. */
function assignedName(node) {
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
    node.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
    ts.isIdentifier(node.left)
  ) {
    return node.left.text;
  }
  if (
    (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
    (node.operator === ts.SyntaxKind.PlusPlusToken ||
      node.operator === ts.SyntaxKind.MinusMinusToken) &&
    ts.isIdentifier(node.operand)
  ) {
    return node.operand.text;
  }
  return undefined;
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

/**
 * Loads a patched bundle in a child process and calls its exported Lambda
 * handler the way API Gateway does, for GET and for a form-encoded POST, with
 * no code (so nothing signs in). The
 * patch is accepted only if a forged state host is never redirected to, and a
 * legitimate state still reaches its host.
 */
export function verifyPatchedBundle(file) {
  const script = `
    const { handler } = require(process.argv[1]);
    const requestContext = { domainName: "api.memotron.app" };
    const get = (state) => ({
      httpMethod: "GET",
      headers: {},
      queryStringParameters: { state },
      pathParameters: { provider: "google" },
      requestContext: { ...requestContext, httpMethod: "GET" },
      body: null,
      isBase64Encoded: false
    });
    const post = (state) => ({
      httpMethod: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      queryStringParameters: null,
      pathParameters: { provider: "google" },
      requestContext: { ...requestContext, httpMethod: "POST" },
      body: new URLSearchParams({ state }).toString(),
      isBase64Encoded: false
    });
    (async () => {
      const log = console.log; console.log = () => {}; console.error = () => {};
      const results = {};
      for (const [method, event] of [["GET", get], ["POST", post]]) {
        results[method] = {
          forged: await handler(event("probe:evil.example/x.memotron.app")),
          trusted: await handler(event("probe:web.memotron.app"))
        };
      }
      log(JSON.stringify(results));
    })().catch((error) => { process.stderr.write(String(error)); process.exit(1); });`;
  const run = spawnSync(process.execPath, ["-e", script, path.resolve(file)], {
    encoding: "utf8",
    timeout: 60_000,
    env: { PATH: process.env.PATH ?? "" }
  });
  if (run.status !== 0) {
    throw new Error(`patched bundle did not run: ${run.stderr || run.error}`);
  }
  const results = JSON.parse(run.stdout.trim().split("\n").pop());
  for (const method of ["GET", "POST"]) {
    const { forged, trusted } = results[method] ?? {};
    if (
      forged?.statusCode !== 302 ||
      forged?.headers?.Location !==
        "https://web.memotron.app/oauth/error?error=Unknown%20redirect%20host"
    ) {
      throw new Error(`forged state was not refused (${method}): ${JSON.stringify(forged)}`);
    }
    if (
      trusted?.statusCode !== 302 ||
      trusted?.headers?.Location !== "https://web.memotron.app/oauth"
    ) {
      throw new Error(
        `legitimate state no longer redirects (${method}): ${JSON.stringify(trusted)}`
      );
    }
  }
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
  try {
    verifyPatchedBundle(output);
  } catch (error) {
    fs.rmSync(output, { force: true });
    console.error(String(error));
    process.exit(1);
  }
  console.log(`patched and verified ${output}`);
}
