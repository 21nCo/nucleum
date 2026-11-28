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
// that trusts `state`, and the wrapper the Lambda handler calls.
const legacyBundle = [
  '"use strict";',
  "var calls=0;",
  'async function ine(e,t,r){calls++;return{token:"test-session-token",isSignup:!1}}',
  'async function ane(e,t,r){let n="";try{let s=e.state.split(":")[1];n="https://"+s+"/oauth";let a=await ine(e,t,r);return{statusCode:302,headers:{Location:n+"?token="+a.token},body:""}}catch(s){return{}}}',
  'var ev="",hO="";',
  "async function pYe(e){return ane(e,ev,hO)}",
  "module.exports={run:(e,p,d)=>{ev=p;hO=d;return pYe(e)},calls:()=>calls};"
].join("");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-oauth-patch-"));
afterAll(() => fs.rmSync(tempDir, { recursive: true, force: true }));

async function loadPatched() {
  const file = path.join(tempDir, `bundle-${Math.random().toString(36).slice(2)}.cjs`);
  fs.writeFileSync(file, patchBundle(legacyBundle, await compileRedirectModule()));
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

  it("keeps the strict-mode prologue first", async () => {
    const patched = patchBundle(legacyBundle, "var __legacyOAuthRedirect={};");
    expect(patched.startsWith('"use strict";\nvar __legacyOAuthRedirect')).toBe(true);
  });

  it("refuses bundles it does not recognise or has already patched", () => {
    expect(() => patchBundle("module.exports={};", "")).toThrow(
      /expected one redirect handler wrapper/
    );
    const patched = patchBundle(legacyBundle, "var __legacyOAuthRedirect={};");
    expect(() => patchBundle(patched, "")).toThrow(/already patched/);
  });
});
