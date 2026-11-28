import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  compileRedirectModule,
  patchBundle
} from "../../server/scripts/patch-legacy-oauth-redirect.mjs";

// Shape of the deployed legacy bundle: the sign-in step, the redirect handler
// that trusts `state`, the wrapper and the exported Lambda handler that calls it.
function legacyBundleWith(names: { signIn: string; handler: string; wrapper: string }) {
  const { signIn, handler, wrapper } = names;
  return [
    '"use strict";',
    "var calls=0;",
    `async function ${signIn}(e,t,r){calls++;return{token:"test-session-token",isSignup:!1}}`,
    `async function ${handler}(e,t,r){let n="";try{let s=e.state.split(":")[1];n="https://"+s+"/oauth";let a=await ${signIn}(e,t,r);return{statusCode:302,headers:{Location:n+"?token="+a.token},body:""}}catch(s){return{}}}`,
    'var ev="",hO="";',
    // A decoy with the same shape that the Lambda handler never calls.
    `async function decoy(e){return ${handler}(e,ev,hO)}`,
    "async function run(e,t){return t(e.body)}",
    `async function lambdaHandler(e){return ev=e.provider,hO=e.domain,run(e,${wrapper},!1)}`,
    `async function ${wrapper}(e){return ${handler}(e,ev,hO);}`,
    "var exportsObject={};define(exportsObject,{handler:()=>lambdaHandler});",
    "function define(t,r){t.handler=r.handler()}",
    "module.exports={run:(body,provider,domain)=>exportsObject.handler({body,provider,domain}),calls:()=>calls};"
  ].join("");
}

const legacyBundle = legacyBundleWith({ signIn: "ine", handler: "ane", wrapper: "pYe" });

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-oauth-patch-"));
afterAll(() => fs.rmSync(tempDir, { recursive: true, force: true }));

async function loadPatched(bundle = legacyBundle) {
  const file = path.join(tempDir, `bundle-${Math.random().toString(36).slice(2)}.cjs`);
  fs.writeFileSync(file, patchBundle(bundle, await compileRedirectModule()));
  return createRequire(import.meta.url)(file) as {
    run: (e: unknown, provider: string, domain: string) => Promise<any>;
    calls: () => number;
  };
}

describe("patch-legacy-oauth-redirect", () => {
  it("routes the deployed handler through the allowlist", async () => {
    const bundle = await loadPatched();

    const trusted = await bundle.run(
      { state: "guest:web.memotron.app" },
      "google",
      "api.memotron.app"
    );
    expect(trusted.headers.Location).toBe(
      "https://web.memotron.app/oauth?token=test-session-token&provider=google&signup=false"
    );
    expect(bundle.calls()).toBe(1);

    const forged = await bundle.run(
      { state: "g:evil.example/x.memotron.app" },
      "google",
      "api.memotron.app"
    );
    expect(forged.headers.Location).toBe(
      "https://web.memotron.app/oauth/error?error=Unknown%20redirect%20host"
    );
    expect(bundle.calls()).toBe(1);
  });

  it("keeps minified names that contain $ intact", async () => {
    const bundle = await loadPatched(
      legacyBundleWith({ signIn: "a$$e", handler: "$$h", wrapper: "w$$" })
    );
    const response = await bundle.run(
      { state: "guest:web.memotron.app" },
      "google",
      "api.memotron.app"
    );
    expect(response.headers.Location).toContain("?token=test-session-token");
    expect(bundle.calls()).toBe(1);
  });

  it("patches the wrapper the Lambda handler calls, not a decoy", () => {
    const patched = patchBundle(legacyBundle, "var __legacyOAuthRedirect={};");
    expect(patched).toContain(
      "async function pYe(e){return __legacyOAuthRedirect.buildOAuthRedirectResponse(e,ev,hO,ine)}"
    );
    expect(patched).toContain("async function decoy(e){return ane(e,ev,hO)}");
  });

  it("keeps the strict-mode prologue first", async () => {
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
