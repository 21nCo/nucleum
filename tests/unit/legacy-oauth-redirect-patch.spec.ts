import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  compileRedirectModule,
  patchBundle,
  verifyPatchedBundle
} from "../../server/scripts/patch-legacy-oauth-redirect.mjs";

// Shape of the deployed legacy bundle: the sign-in step, the redirect handler
// that trusts `state`, the wrapper and the exported Lambda handler that calls it.
function legacyBundleWith(names: { signIn: string; handler: string; wrapper: string }) {
  const { signIn, handler, wrapper } = names;
  return [
    '"use strict";',
    "var calls=0;",
    `async function ${signIn}(e,t,r){calls++;return e.code?{token:"test-session-token",isSignup:!1}:undefined}`,
    `async function ${handler}(e,t,r){let n="";try{let s=e.state.split(":")[1];n="https://"+s+"/oauth";let a=await ${signIn}(e,t,r);return{statusCode:302,headers:{Location:a?n+"?token="+a.token:n},body:""}}catch(s){return{}}}`,
    'var ev="",hO="";',
    // A decoy with the same shape that the Lambda handler never calls.
    `async function decoy(e){return ${handler}(e,ev,hO)}`,
    'async function run(e,t){return t(e.httpMethod==="POST"?Object.fromEntries(new URLSearchParams(e.body)):e.queryStringParameters)}',
    "function record(){}",
    // A call of the same shape that is not the handler's return value.
    `async function lambdaHandler(e){record(e,decoy,!1);return ev=e.pathParameters.provider,hO=e.requestContext.domainName,run(e,${wrapper},!1)}`,
    // Same dispatch shape outside the exported handler: must not be followed.
    "var later=(e)=>run(e,decoy,!1);",
    `async function ${wrapper}(e){return ${handler}(e,ev,hO);}`,
    "var exportsObject={};define(exportsObject,{handler:()=>lambdaHandler});",
    "function define(t,r){t.handler=r.handler()}",
    "module.exports={handler:(e)=>exportsObject.handler(e),calls:()=>calls};"
  ].join("");
}

const legacyBundle = legacyBundleWith({ signIn: "ine", handler: "ane", wrapper: "pYe" });

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-oauth-patch-"));
afterAll(() => fs.rmSync(tempDir, { recursive: true, force: true }));

function writeBundle(source: string) {
  const file = path.join(tempDir, `bundle-${Math.random().toString(36).slice(2)}.cjs`);
  fs.writeFileSync(file, source);
  return file;
}

async function patchedFile(bundle = legacyBundle) {
  return writeBundle(patchBundle(bundle, await compileRedirectModule()));
}

type Bundle = { handler: (event: unknown) => Promise<any>; calls: () => number };

const event = (state: string) => ({
  queryStringParameters: { state, code: "test-code" },
  pathParameters: { provider: "google" },
  requestContext: { domainName: "api.memotron.app" }
});

describe("patch-legacy-oauth-redirect", () => {
  it("routes the exported handler through the allowlist", async () => {
    const bundle: Bundle = createRequire(import.meta.url)(await patchedFile());

    const trusted = await bundle.handler(event("guest:web.memotron.app"));
    expect(trusted.headers.Location).toBe(
      "https://web.memotron.app/oauth?token=test-session-token&provider=google&signup=false"
    );
    expect(bundle.calls()).toBe(1);

    const forged = await bundle.handler(event("g:evil.example/x.memotron.app"));
    expect(forged.headers.Location).toBe(
      "https://web.memotron.app/oauth/error?error=Unknown%20redirect%20host"
    );
    expect(bundle.calls()).toBe(1);
  });

  it("verifies a patched bundle by calling its exported handler", async () => {
    expect(() => verifyPatchedBundle(writeBundle(legacyBundle))).toThrow(
      /forged state was not refused/
    );
    expect(() =>
      verifyPatchedBundle(writeBundle(patchBundle(legacyBundle, "")))
    ).toThrow(/did not run/);
    expect(() => verifyPatchedBundle(writeBundle("module.exports={};"))).toThrow(
      /did not run/
    );
    // A bundle whose POST path still runs the old redirect fails on POST.
    const postBypass = (await compileRedirectModule()) + "\n" +
      patchBundle(legacyBundle, "").replace(
        "async function run(e,t){",
        'async function run(e,t){if(e.httpMethod==="POST")return ane(Object.fromEntries(new URLSearchParams(e.body)),ev,hO);'
      );
    expect(() => verifyPatchedBundle(writeBundle(postBypass))).toThrow(
      /forged state was not refused \(POST google\)/
    );
    const patched = await patchedFile();
    expect(() => verifyPatchedBundle(patched)).not.toThrow();
  });

  it("keeps minified names that contain $ intact", async () => {
    const bundle: Bundle = createRequire(import.meta.url)(
      await patchedFile(legacyBundleWith({ signIn: "a$$e", handler: "$$h", wrapper: "w$$" }))
    );
    const response = await bundle.handler(event("guest:web.memotron.app"));
    expect(response.headers.Location).toContain("?token=test-session-token");
    expect(bundle.calls()).toBe(1);
  });

  it("patches the wrapper the Lambda handler returns, not a decoy", () => {
    const patched = patchBundle(legacyBundle, "var __legacyOAuthRedirect={};");
    expect(patched).toContain(
      "async function pYe(e){return __legacyOAuthRedirect.buildOAuthRedirectResponse(e,ev,hO,ine);}"
    );
    expect(patched).toContain("async function decoy(e){return ane(e,ev,hO)}");
  });

  it("refuses a handler whose return value is not the dispatch", () => {
    expect(() =>
      patchBundle(legacyBundle.replace("run(e,pYe,!1)}", "run(e,pYe)}"), "")
    ).toThrow(/does not return an unauthenticated dispatch/);
  });

  it("refuses a bundle where a scope shadows a name in the chain", () => {
    expect(() =>
      patchBundle(
        legacyBundle.replace(
          "async function lambdaHandler(e){",
          "async function lambdaHandler(e){let pYe=decoy;"
        ),
        ""
      )
    ).toThrow(/pYe is bound 2 times/);
  });

  it("refuses a bundle that reassigns a function in the chain", () => {
    expect(() =>
      patchBundle(legacyBundle.replace("var later=", "pYe=decoy;var later="), "")
    ).toThrow(/pYe is reassigned/);
  });

  it("keeps the strict-mode prologue first", () => {
    const patched = patchBundle(legacyBundle, "var __legacyOAuthRedirect={};");
    expect(patched.startsWith('"use strict";\nvar __legacyOAuthRedirect')).toBe(true);
  });

  it("refuses bundles it does not recognise or has already patched", () => {
    expect(() => patchBundle("module.exports={};", "")).toThrow(
      /expected one exported Lambda handler/
    );
    expect(() =>
      patchBundle(legacyBundle.replace('e.state.split(":")[1]', "e.state"), "")
    ).toThrow(/is not the OAuth redirect handler/);
    const patched = patchBundle(legacyBundle, "var __legacyOAuthRedirect={};");
    expect(() => patchBundle(patched, "")).toThrow(/already patched/);
  });
});
