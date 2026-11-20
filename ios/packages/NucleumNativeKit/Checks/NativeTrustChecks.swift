import Foundation

var failures = 0
func check(_ condition: Bool, _ name: String) {
  if !condition {
    failures += 1
    print("FAIL: \(name)")
  }
}

let origins = [URL(string: "tauri://localhost")!, URL(string: "https://web.nucleum.app")!]
func account(_ value: String) -> Bool {
  NativeTrust.isTrustedAccountURL(
    URL(string: value)!, accountDomain: "nucleum.app", devHostZone: "21n.dev", productLabel: "nucleum")
}

check(account("https://account-insouth.nucleum.app"), "live account host")
check(account("https://account-useast-pre.nucleum.app/auth"), "pre account host")
check(account("https://nucleum-account-euwest.21n.dev"), "dev account host")
check(!account("http://account-insouth.nucleum.app"), "http account host refused")
check(!account("https://evil.example"), "foreign host refused")
check(!account("https://nucleum.app.evil.example"), "suffix trick refused")
check(!account("https://other-account-insouth.21n.dev"), "other product on dev zone refused")
check(!account("https://a.nucleum-account-insouth.21n.dev"), "nested dev host refused")
check(!account("https://user@account-insouth.nucleum.app"), "userinfo refused")

check(NativeTrust.isTrustedFrameOrigin(scheme: "tauri", host: "localhost", port: 0, trustedOrigins: origins), "bundled origin")
check(NativeTrust.isTrustedFrameOrigin(scheme: "https", host: "web.nucleum.app", port: 0, trustedOrigins: origins), "web origin")
check(!NativeTrust.isTrustedFrameOrigin(scheme: "https", host: "platform.twitter.com", port: 0, trustedOrigins: origins), "embed origin refused")
check(!NativeTrust.isTrustedFrameOrigin(scheme: "https", host: "web.nucleum.app", port: 8443, trustedOrigins: origins), "other port refused")

func decide(_ value: String) -> NativeTrust.NavigationDecision {
  NativeTrust.mainFrameNavigationDecision(
    for: URL(string: value)!, trustedOrigins: origins, isTrustedAccountURL: { url in
      NativeTrust.isTrustedAccountURL(url, accountDomain: "nucleum.app", devHostZone: "21n.dev", productLabel: "nucleum")
    })
}
check(decide("tauri://localhost/index.html") == .allow, "bundled navigation allowed")
check(decide("https://web.nucleum.app/library") == .allow, "web origin navigation allowed")
check(decide("https://account-insouth.nucleum.app/auth/x") == .allow, "account navigation allowed")
check(decide("about:blank") == .allow, "about:blank allowed")
check(decide("https://evil.example/") == .openExternally, "foreign web opens externally")
check(decide("mailto:someone@example.com") == .openExternally, "mailto opens externally")
check(decide("javascript:alert(1)") == .cancel, "javascript cancelled")
check(decide("data:text/html,x") == .cancel, "data cancelled")
check(decide("file:///etc/hosts") == .cancel, "file cancelled")

check(NativeTrust.isSignInDeepLink(URL(string: "nucleum://oauthsignin#token=x")!, appScheme: "nucleum"), "sign-in link")
check(!NativeTrust.isSignInDeepLink(URL(string: "nucleum://debug-oauthsignin")!, appScheme: "nucleum"), "lookalike link")

print(failures == 0 ? "NativeTrust checks passed" : "\(failures) NativeTrust checks failed")
exit(failures == 0 ? 0 : 1)
