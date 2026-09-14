# Legacy OAuth follow-up

Reviewed for PR #584 on 2026-09-14. This is an unresolved security risk, not a completed remediation or deployment verification.

## Evidence

- `client/application/account/oauth.ts` constructs state from guest and host values. URL encoding is present, but the state is predictable and is not a one-time browser-bound nonce.
- When configured for PKCE, that client sends the constant `challenge`. `server/common/oauth/oauth.utils.ts` sends the same constant as `code_verifier`.
- `server/common/oauth/oauth.ts` parses routing information directly from state. `server/common/oauth/oauth.endpoints.ts` owns the legacy callback redirection.
- `client/routes/embed/+page.svelte` still invokes this client flow. The ordinary account sign-in controls use `authClient().startSocialSignIn` instead.
- Legacy CDK code declares `oauth.handler`, but this review did not establish which deployed callback currently serves native clients. Source reachability does not prove deployment usage.

## Required follow-up

1. Inventory deployed callback URLs, provider configuration, and native app versions that invoke the embed flow.
2. Prefer migrating those callers to the account service's existing AuthFn social OAuth implementation. Verify provider support and native return routing before retiring legacy handlers.
3. If a legacy callback must remain, implement a matching initiation/callback transaction: cryptographically random single-use state, browser binding, expiry, replay prevention, provider binding, and validated redirect destinations. Generate a random PKCE verifier and S256 challenge and make the verifier available only to the matching token exchange.
4. Verify successful and rejected callbacks for Apple and Google, including native return handling, mismatched state, expired/replayed transactions, and incorrect verifiers.

Do not replace only the frontend state with a random value: the legacy callback currently depends on its guest/domain structure. Do not describe the runtime debug-host repair in PR #584 as a fix for state or PKCE security.
