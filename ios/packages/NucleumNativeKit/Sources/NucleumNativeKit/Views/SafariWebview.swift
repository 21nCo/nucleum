import AuthenticationServices
import Foundation
import SafariServices
import SwiftUI

struct SafariTestView: View {
  // whether or not to show the Safari ViewController
  @State var showSafari = false
  // initial URL string
  @State var urlString = "https://duckduckgo.com"

  var body: some View {
    Button(action: {
      // update the URL if you'd like to
      self.urlString = "https://duckduckgo.com"
      // tell the app that we want to show the Safari VC
      self.showSafari = true
    }) {
      Text("Present Safari")
    }
    // summon the Safari sheet
    .sheet(isPresented: $showSafari) {
      SafariView(url: URL(string: self.urlString)!)
    }
  }
}

struct SafariView: UIViewControllerRepresentable {

  let url: URL

  func makeUIViewController(context: UIViewControllerRepresentableContext<SafariView>)
    -> SFSafariViewController
  {
    return SFSafariViewController(url: url)
  }

  func updateUIViewController(
    _ uiViewController: SFSafariViewController,
    context: UIViewControllerRepresentableContext<SafariView>
  ) {

  }

}

struct AuthenticationTestView: View {
  @State private var isPresented = false
  @State private var urlString = ""

  var body: some View {
    Button("Sign in with Google") {
      isPresented = true
    }
    .sheet(isPresented: $isPresented) {
      WebAuthenticationView(url: URL(string: urlString)!, callbackURLScheme: "tauri") {
        callbackURL, error in
        isPresented = false
        if let callbackURL = callbackURL {
          // Handle successful authentication
          print("Success: \(callbackURL)")
        } else if let error = error {
          // Handle error
          print("Error: \(error.localizedDescription)")
        }
      }
    }
  }
}

struct WebAuthenticationView: UIViewControllerRepresentable {
  let url: URL
  let callbackURLScheme: String
  let completionHandler: (URL?, Error?) -> Void

  class AuthSessionContainer {
    var session: ASWebAuthenticationSession?
    var sessionId: UUID?
    var sessionKey: String?
    var isCompleting = false
    var cancelledSessionIds = Set<UUID>()
  }

  private static var authSessionContainer = AuthSessionContainer()

  func makeUIViewController(context: Context) -> UIViewController {
    Log.info("WebAuthenticationView.makeUIViewController - \(redactOAuthUrl(url))")
    return UIViewController()
  }

  func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
    let sessionKey = "\(callbackURLScheme)|\(url.absoluteString)"
    Log.info("WebAuthenticationView.updateUIViewController - \(redactOAuthUrl(url))")

    if WebAuthenticationView.authSessionContainer.isCompleting {
      return
    }

    if let activeSession = WebAuthenticationView.authSessionContainer.session {
      if WebAuthenticationView.authSessionContainer.sessionKey == sessionKey {
        return
      }

      if let activeSessionId = WebAuthenticationView.authSessionContainer.sessionId {
        WebAuthenticationView.authSessionContainer.cancelledSessionIds.insert(activeSessionId)
      }
      Log.info(
        "WebAuthenticationView.cancelStaleSession - old=\(WebAuthenticationView.authSessionContainer.sessionKey ?? "unknown") new=\(sessionKey)"
      )
      activeSession.cancel()
      WebAuthenticationView.authSessionContainer.session = nil
      WebAuthenticationView.authSessionContainer.sessionId = nil
      WebAuthenticationView.authSessionContainer.sessionKey = nil
      WebAuthenticationView.authSessionContainer.isCompleting = false
    }

    let sessionId = UUID()
    let authSession = ASWebAuthenticationSession(
      url: url,
      callbackURLScheme: callbackURLScheme,
      completionHandler: { url, error in
        if WebAuthenticationView.authSessionContainer.cancelledSessionIds.remove(sessionId) != nil {
          Log.info("WebAuthenticationView.completion.ignoredCancelledSession - id=\(sessionId)")
          return
        }

        WebAuthenticationView.authSessionContainer.isCompleting = true
        let callbackDescription = url.map { redactOAuthUrl($0) } ?? "nil"
        Log.info(
          "WebAuthenticationView.completion - id=\(sessionId) url=\(callbackDescription) error=\(describeAuthenticationError(error))"
        )
        completionHandler(url, error)
        if WebAuthenticationView.authSessionContainer.sessionId == sessionId {
          WebAuthenticationView.authSessionContainer.session = nil
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
          if WebAuthenticationView.authSessionContainer.session == nil {
            WebAuthenticationView.authSessionContainer.sessionId = nil
            WebAuthenticationView.authSessionContainer.sessionKey = nil
            WebAuthenticationView.authSessionContainer.isCompleting = false
          }
        }
      }
    )
    authSession.prefersEphemeralWebBrowserSession = false
    authSession.presentationContextProvider = context.coordinator
    WebAuthenticationView.authSessionContainer.session = authSession
    WebAuthenticationView.authSessionContainer.sessionId = sessionId
    WebAuthenticationView.authSessionContainer.sessionKey = sessionKey
    WebAuthenticationView.authSessionContainer.isCompleting = false

    let didStart = authSession.start()
    Log.info(
      "WebAuthenticationView.start - id=\(sessionId) didStart=\(didStart) callbackURLScheme=\(callbackURLScheme) url=\(redactOAuthUrl(url))"
    )
    if !didStart {
      WebAuthenticationView.authSessionContainer.session = nil
      WebAuthenticationView.authSessionContainer.sessionId = nil
      WebAuthenticationView.authSessionContainer.sessionKey = nil
    }
  }

  func makeCoordinator() -> Coordinator {
    Coordinator(self)
  }

  class Coordinator: NSObject, ASWebAuthenticationPresentationContextProviding {
    var parent: WebAuthenticationView

    init(_ parent: WebAuthenticationView) {
      self.parent = parent
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
      let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene
      return scene?.windows.first ?? ASPresentationAnchor()
    }
  }
}

private func describeAuthenticationError(_ error: Error?) -> String {
  guard let error = error else { return "nil" }
  let nsError = error as NSError
  var parts = [
    "domain=\(nsError.domain)",
    "code=\(nsError.code)",
    "message=\(nsError.localizedDescription)"
  ]
  if let failureReason = nsError.localizedFailureReason {
    parts.append("failureReason=\(failureReason)")
  }
  if let recoverySuggestion = nsError.localizedRecoverySuggestion {
    parts.append("recoverySuggestion=\(recoverySuggestion)")
  }
  let filteredUserInfo = nsError.userInfo
    .filter { key, _ in
      let normalized = key.lowercased()
      return !normalized.contains("token")
        && !normalized.contains("secret")
        && !normalized.contains("password")
        && !normalized.contains("code")
    }
    .map { "\($0.key)=\($0.value)" }
    .joined(separator: ",")
  if !filteredUserInfo.isEmpty {
    parts.append("userInfo={\(filteredUserInfo)}")
  }
  return parts.joined(separator: " ")
}

private func redactOAuthUrl(_ url: URL) -> String {
  guard var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
    return url.absoluteString
  }

  guard let query = components.percentEncodedQuery else {
    return url.absoluteString
  }

  let redactedQuery = query
    .split(separator: "&", omittingEmptySubsequences: false)
    .map { pair -> String in
      let parts = pair.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
      guard let encodedName = parts.first else {
        return String(pair)
      }
      let name = String(encodedName).removingPercentEncoding ?? String(encodedName)
      let normalized = name.lowercased()

      if normalized.contains("state")
        || normalized.contains("nonce")
        || normalized.contains("token")
        || normalized.contains("secret")
        || normalized.contains("code")
      {
        return "\(encodedName)=%5BREDACTED%5D"
      }
      return String(pair)
    }
    .joined(separator: "&")

  components.percentEncodedQuery = redactedQuery
  return components.string ?? url.absoluteString
}
