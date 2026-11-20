import Foundation

var failures = 0
func check(_ condition: Bool, _ name: String) {
  if !condition {
    failures += 1
    print("FAIL: \(name)")
  }
}

let origins = [URL(string: "tauri://localhost")!, URL(string: "https://web.nucleum.app")!]
let accountOrigins = ["insouth", "useast", "euwest"].map { URL(string: "https://account-\($0).nucleum.app")! }
func account(_ value: String) -> Bool {
  NativeTrust.isTrustedAccountURL(URL(string: value)!, allowedAccountOrigins: accountOrigins)
}

check(account("https://account-insouth.nucleum.app"), "configured account host")
check(account("https://account-useast.nucleum.app/auth"), "configured account host with path")
check(!account("https://web.nucleum.app"), "web host refused")
check(!account("https://help.nucleum.app"), "sibling subdomain refused")
check(!account("https://account-insouth.nucleum.app:8443"), "other port refused")
check(!account("http://account-insouth.nucleum.app"), "http refused")
check(!account("https://nucleum-account-insouth.21n.dev"), "dev host refused in this environment")
check(!account("https://user@account-insouth.nucleum.app"), "userinfo refused")

check(NativeTrust.acceptsBridgeMessage(isMainFrame: true, scheme: "tauri", host: "localhost", port: 0, trustedOrigins: origins), "bundled main frame")
check(NativeTrust.acceptsBridgeMessage(isMainFrame: true, scheme: "https", host: "web.nucleum.app", port: 0, trustedOrigins: origins), "web main frame")
check(!NativeTrust.acceptsBridgeMessage(isMainFrame: false, scheme: "tauri", host: "localhost", port: 0, trustedOrigins: origins), "subframe refused")
check(!NativeTrust.acceptsBridgeMessage(isMainFrame: true, scheme: "https", host: "platform.twitter.com", port: 0, trustedOrigins: origins), "foreign main frame refused")
check(!NativeTrust.acceptsBridgeMessage(isMainFrame: true, scheme: "https", host: "web.nucleum.app", port: 8443, trustedOrigins: origins), "other port refused")

func decide(_ value: String, target: Bool? = true, source: Bool = true) -> NativeTrust.NavigationDecision {
  NativeTrust.navigationDecision(
    for: URL(string: value)!, targetIsMainFrame: target, sourceIsMainFrame: source,
    trustedOrigins: origins, appScheme: "nucleum", isTrustedAccountURL: { url in
      NativeTrust.isTrustedAccountURL(url, allowedAccountOrigins: accountOrigins)
    })
}
check(decide("tauri://localhost/index.html") == .allow, "bundled navigation allowed")
check(decide("https://web.nucleum.app/library") == .allow, "web origin navigation allowed")
check(decide("https://account-insouth.nucleum.app/auth/x") == .allow, "account navigation allowed")
check(decide("about:blank") == .allow, "about:blank allowed")
check(decide("https://accounts.google.com/o/oauth2/v2/auth?x=1") == .allow, "app main frame keeps Google sign-in in the WebView")
check(decide("https://appleid.apple.com/auth/authorize") == .allow, "app main frame keeps Apple sign-in in the WebView")
check(decide("https://github.com/login/oauth/authorize") == .allow, "app main frame keeps GitHub sign-in in the WebView")
check(decide("https://accounts.google.com/o/oauth2/v2/auth", target: true, source: false) == .cancel, "embed cannot send the app to a provider page")
check(decide("nucleum://oauthsignin?token=x") == .allow, "app scheme from the app main frame unchanged")
check(decide("nucleum://oauthsignin?token=x", target: true, source: false) == .cancel, "embed cannot open the app scheme")
check(decide("https://github.com/nucleum") == .openExternally, "other GitHub page opens externally")
check(decide("https://evil.example/") == .openExternally, "foreign web opens externally")
check(decide("mailto:someone@example.com") == .openExternally, "mailto opens externally")
check(decide("javascript:alert(1)") == .cancel, "javascript cancelled")
check(decide("data:text/html,x") == .cancel, "data cancelled")
check(decide("file:///etc/hosts") == .cancel, "file cancelled")
check(decide("https://evil.example/", target: false, source: false) == .allow, "subframe navigation unchanged")
check(decide("https://evil.example/", target: nil, source: false) == .cancel, "popup from an embed discarded")
check(decide("https://evil.example/", target: nil, source: true) == .openExternally, "popup from the app opens externally")

check(NativeTrust.signInDeepLinkKind(URL(string: "nucleum://oauthsignin#token=x")!, appScheme: "nucleum") == "oauthsignin", "sign-in link")
check(NativeTrust.signInDeepLinkKind(URL(string: "nucleum://oauthsignarchived?token=x")!, appScheme: "nucleum") == "oauthsignarchived", "archived link")
check(NativeTrust.signInDeepLinkKind(URL(string: "nucleum://debug-oauthsignin")!, appScheme: "nucleum") == nil, "lookalike host")
check(NativeTrust.signInDeepLinkKind(URL(string: "nucleum://x?oauthsignarchived&token=x")!, appScheme: "nucleum") == nil, "query lookalike")
check(NativeTrust.signInDeepLinkKind(URL(string: "memotron://oauthsignin")!, appScheme: "nucleum") == nil, "other app scheme")

print(failures == 0 ? "NativeTrust checks passed" : "\(failures) NativeTrust checks failed")
exit(failures == 0 ? 0 : 1)
