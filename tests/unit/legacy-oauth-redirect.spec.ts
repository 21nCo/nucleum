import { describe, expect, it, vi } from "vitest";

import {
  buildOAuthRedirectAllowlist,
  buildOAuthRedirectResponse,
  resolveOAuthRedirectTarget
} from "../../server/common/oauth/oauth-redirect";

const allowlist = buildOAuthRedirectAllowlist();

describe("legacy OAuth redirect allowlist", () => {
  it("builds client hosts from the frontend product config and legacy hosts", () => {
    for (const host of [
      "web.memotron.app",
      "pre.memotron.app",
      "memotron.21n.dev",
      "web.pointron.app",
      "web.nucleum.app",
      "dev.memotron.app",
      "web.nucleus.to"
    ]) {
      expect(allowlist.hosts.has(host), host).toBe(true);
    }
    expect(allowlist.hosts.has("api.memotron.app")).toBe(false);
    expect([...allowlist.schemes].sort()).toEqual([
      "memotron",
      "nucleum",
      "nucleus",
      "pointron"
    ]);
  });

  it("maps each live legacy API host to its product's default web host", () => {
    expect(Object.fromEntries(allowlist.defaultHostByApiHost)).toMatchObject({
      "api.memotron.app": "web.memotron.app",
      "api.memotron.xyz": "pre.memotron.app",
      "api.nucleus.website": "web.nucleum.app",
      "api.pointron.app": "web.pointron.app",
      "api.pointron.xyz": "pre.pointron.app"
    });
  });
});

describe("resolveOAuthRedirectTarget", () => {
  const resolve = (domainPart: string | undefined, apiHost = "api.memotron.app") =>
    resolveOAuthRedirectTarget(domainPart, apiHost, allowlist);

  it("trusts allowlisted web, desktop and app clients", () => {
    expect(resolve("web.memotron.app")).toEqual({
      trusted: true,
      url: "https://web.memotron.app/oauth",
      isSchemeRedirect: false
    });
    expect(resolve("localredirect.web.memotron.app")).toEqual({
      trusted: true,
      url: "tauri://localhost/index.html",
      isSchemeRedirect: false
    });
    expect(resolve("memotron_schemeredirect.web.memotron.app")).toEqual({
      trusted: true,
      url: "memotron://oauthsignin",
      isSchemeRedirect: true
    });
  });

  it.each([
    "evil.example",
    "evil.example/x.memotron.app",
    "evil.example/web.memotron.app",
    "web.memotron.app.evil.example",
    "web.memotron.app@evil.example",
    "WEB.memotron.app",
    "localredirect.evil.example",
    "evil_schemeredirect.web.memotron.app",
    "memotron_schemeredirect.evil.example",
    "javascript_schemeredirect.web.memotron.app",
    "",
    undefined
  ])("refuses %s and falls back to the API's default host", (domainPart) => {
    expect(resolve(domainPart)).toEqual({
      trusted: false,
      url: "https://web.memotron.app/oauth"
    });
  });

  it("has no fallback for an unknown API host", () => {
    expect(resolve("evil.example", "abc.execute-api.us-east-1.amazonaws.com")).toEqual({
      trusted: false,
      url: undefined
    });
  });
});

describe("buildOAuthRedirectResponse", () => {
  const signedIn = { token: "test-session-token", isSignup: false };

  it("returns the token to an allowlisted web host", async () => {
    const signIn = vi.fn().mockResolvedValue(signedIn);
    const response = await buildOAuthRedirectResponse(
      { state: "guest:web.memotron.app", code: "test-code" },
      "google",
      "api.memotron.app",
      signIn,
      allowlist
    );
    expect(signIn).toHaveBeenCalledOnce();
    expect(response).toEqual({
      statusCode: 302,
      headers: {
        Location:
          "https://web.memotron.app/oauth?token=test-session-token&provider=google&signup=false"
      },
      body: ""
    });
  });

  it("returns the token to an allowlisted app scheme without extra params", async () => {
    const response = await buildOAuthRedirectResponse(
      { state: "guest:pointron_schemeredirect.web.pointron.app", code: "test-code" },
      "google",
      "api.pointron.app",
      vi.fn().mockResolvedValue(signedIn),
      allowlist
    );
    expect(response.headers).toEqual({
      Location: "pointron://oauthsignin?token=test-session-token"
    });
  });

  it("never signs in or sends a token for a forged state host", async () => {
    const signIn = vi.fn().mockResolvedValue(signedIn);
    const response = await buildOAuthRedirectResponse(
      { state: "g:evil.example/x.memotron.app", code: "test-code" },
      "google",
      "api.memotron.app",
      signIn,
      allowlist
    );
    expect(signIn).not.toHaveBeenCalled();
    expect(response).toEqual({
      statusCode: 302,
      headers: {
        Location: "https://web.memotron.app/oauth/error?error=Unknown%20redirect%20host"
      },
      body: ""
    });
  });

  it.each(["g:web.memotron.app:8443", "web.memotron.app", 42])(
    "refuses a malformed state %s",
    async (state) => {
      const signIn = vi.fn().mockResolvedValue(signedIn);
      const response = await buildOAuthRedirectResponse(
        { state, code: "test-code" },
        "google",
        "api.memotron.app",
        signIn,
        allowlist
      );
      expect(signIn).not.toHaveBeenCalled();
      expect(response.headers).toEqual({
        Location: "https://web.memotron.app/oauth/error?error=Unknown%20redirect%20host"
      });
    }
  );

  it("accepts an empty guest part", async () => {
    const response = await buildOAuthRedirectResponse(
      { state: ":web.memotron.app", code: "test-code" },
      "google",
      "api.memotron.app",
      vi.fn().mockResolvedValue(signedIn),
      allowlist
    );
    expect(response.headers).toEqual({
      Location: expect.stringContaining("https://web.memotron.app/oauth?token=")
    });
  });

  it("answers 400 when neither state nor the API host gives a trusted target", async () => {
    const signIn = vi.fn();
    const response = await buildOAuthRedirectResponse(
      { code: "test-code" },
      "google",
      "unknown.example",
      signIn,
      allowlist
    );
    expect(signIn).not.toHaveBeenCalled();
    expect(response).toEqual({
      statusCode: 400,
      headers: { "Content-Type": "text/plain" },
      body: "Unknown redirect host"
    });
  });

  it("redirects sign-in errors and failures to the trusted host", async () => {
    const failed = await buildOAuthRedirectResponse(
      { state: "guest:web.memotron.app", code: "test-code" },
      "google",
      "api.memotron.app",
      vi.fn().mockResolvedValue({ error: "Unknown provider" }),
      allowlist
    );
    expect(failed.headers).toEqual({
      Location: "https://web.memotron.app/oauth/error?error=Unknown provider"
    });

    const thrown = await buildOAuthRedirectResponse(
      { state: "guest:web.memotron.app", code: "test-code" },
      "google",
      "api.memotron.app",
      vi.fn().mockRejectedValue(new Error("boom")),
      allowlist
    );
    expect(thrown.headers).toEqual({
      Location: "https://web.memotron.app/oauth/error?error=Something went wrong"
    });
  });
});
