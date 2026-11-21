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

func decide(
  _ value: String, target: Bool? = true, source: Bool = true, post: Bool = false,
  sourceHost: String? = nil, appSource: Bool = true
) -> NativeTrust.NavigationDecision {
  NativeTrust.navigationDecision(
    for: URL(string: value)!, targetIsMainFrame: target, sourceIsMainFrame: source,
    trustedOrigins: origins, appScheme: "nucleum", isFormPost: post, sourceHost: sourceHost,
    sourceIsAppOrigin: appSource,
    isTrustedAccountURL: { url in
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
check(decide("https://github.com/login?client_id=x&return_to=%2Flogin%2Foauth%2Fauthorize") == .allow, "signed-out GitHub sign-in page stays in the WebView")
check(decide("https://github.com/session", post: true, sourceHost: "github.com", appSource: false) == .allow, "GitHub credential POST stays in the WebView")
check(decide("https://github.com/sessions/two-factor/app", appSource: false) == .allow, "GitHub 2FA stays in the WebView")
check(decide("https://github.com/sessions/verified-device", appSource: false) == .allow, "GitHub device verification stays in the WebView")
check(decide("https://github.com/login", target: true, source: false) == .cancel, "embed cannot send the app to GitHub sign-in")
check(decide("https://github.com/sessionsx") == .openExternally, "GitHub lookalike path opens externally")
check(decide("https://github.com/loginx") == .openExternally, "GitHub lookalike login path opens externally")
check(decide("https://evil.example/") == .openExternally, "foreign web opens externally")
check(decide("mailto:someone@example.com") == .openExternally, "mailto opens externally")
check(decide("https://api.nucleus.website/oauth/apple", post: true, sourceHost: "appleid.apple.com") == .allow, "Apple form_post to the sign-in API keeps loading")
check(decide("https://account-insouth.nucleum.app/auth/social/callback/apple", post: true, sourceHost: "appleid.apple.com", appSource: false) == .allow, "Apple form_post to the account callback keeps loading (account host)")
check(decide("about:blank", appSource: false) == .cancel, "provider page cannot open about:blank in the main frame")
check(decide("nucleum://oauthsignin?token=x", appSource: false) == .cancel, "provider page cannot open the app scheme")
check(decide("https://other-service.example/callback", post: true, sourceHost: "appleid.apple.com") == .openExternally, "Apple form_post for another service does not render")
check(decide("https://api.nucleus.website:8443/oauth/apple", post: true, sourceHost: "appleid.apple.com") == .openExternally, "Apple form_post to another port does not render")
check(decide("https://evil.example/collect", post: true, sourceHost: "web.nucleum.app") == .openExternally, "other form POST does not render in the app")
check(decide("https://api.nucleus.website/oauth/apple", source: false, post: true, sourceHost: "appleid.apple.com") == .cancel, "embed form POST is dropped")
check(decide("about:blank", target: true, source: false) == .cancel, "embed cannot put about:blank in the main frame")
check(decide("blob:https://web.nucleum.app/x", target: true, source: false) == .cancel, "embed cannot put a blob in the main frame")
check(decide("javascript:alert(1)") == .cancel, "javascript cancelled")
check(decide("data:text/html,x") == .cancel, "data cancelled")
check(decide("file:///etc/hosts") == .cancel, "file cancelled")
check(decide("https://evil.example/", target: false, source: false) == .allow, "subframe navigation unchanged")
check(decide("https://evil.example/", target: nil, source: false) == .cancel, "popup from an embed discarded")
check(decide("https://evil.example/", target: nil, source: true) == .openExternally, "popup from the app opens externally")
check(decide("https://evil.example/", target: true, source: false) == .cancel, "embed cannot open the system browser")
check(decide("tel:+10000000000", target: true, source: false) == .cancel, "embed cannot open the dialer")
check(decide("mailto:someone@example.com", target: true, source: false) == .cancel, "embed cannot open mail")

check(NativeTrust.signInDeepLinkKind(URL(string: "nucleum://oauthsignin#token=x")!, appScheme: "nucleum") == "oauthsignin", "sign-in link")
check(NativeTrust.signInDeepLinkKind(URL(string: "nucleum://oauthsignarchived?token=x")!, appScheme: "nucleum") == "oauthsignarchived", "archived link")
check(NativeTrust.signInDeepLinkKind(URL(string: "nucleum://debug-oauthsignin")!, appScheme: "nucleum") == nil, "lookalike host")
check(NativeTrust.signInDeepLinkKind(URL(string: "nucleum://x?oauthsignarchived&token=x")!, appScheme: "nucleum") == nil, "query lookalike")
check(NativeTrust.signInDeepLinkKind(URL(string: "memotron://oauthsignin")!, appScheme: "nucleum") == nil, "other app scheme")

print(failures == 0 ? "NativeTrust checks passed" : "\(failures) NativeTrust checks failed")
exit(failures == 0 ? 0 : 1)
