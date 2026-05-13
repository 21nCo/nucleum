import AuthenticationServices
import Foundation
import SwiftUI

struct WebAuthenticationView: NSViewRepresentable {
  let url: URL
  let callbackURLScheme: String
  let completionHandler: (URL?, Error?) -> Void

  // Store the authentication session to prevent it from being deallocated
  class AuthSessionContainer {
    var session: ASWebAuthenticationSession?
    var sessionId: UUID?
    var sessionKey: String?
    var isCompleting = false
    var cancelledSessionIds = Set<UUID>()
  }

  // Use a static variable to maintain the session across view updates
  private static var authSessionContainer = AuthSessionContainer()

  func makeNSView(context: Context) -> NSView {
    Log.info("WebAuthenticationViewForMac.makeNSView - \(redactOAuthUrl(url))")
    return NSView()
  }

  func updateNSView(_ nsView: NSView, context: Context) {
    let sessionKey = "\(callbackURLScheme)|\(url.absoluteString)"
    Log.info("WebAuthenticationViewForMac.updateNSView - \(redactOAuthUrl(url))")

    guard isAllowedExternalUrl(url) else {
      Log.error(message: "Refusing to start authentication with an insecure URL")
      completionHandler(nil, nil)
      return
    }

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
        "WebAuthenticationViewForMac.cancelStaleSession - old=\(WebAuthenticationView.authSessionContainer.sessionKey ?? "unknown") new=\(sessionKey)"
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
          Log.info("WebAuthenticationViewForMac.completion.ignoredCancelledSession - id=\(sessionId)")
          return
        }

        WebAuthenticationView.authSessionContainer.isCompleting = true
        let callbackDescription = url.map { redactOAuthUrl($0) } ?? "nil"
        Log.info(
          "WebAuthenticationViewForMac.completion - id=\(sessionId) url=\(callbackDescription) error=\(describeAuthenticationError(error))"
        )

        self.completionHandler(url, error)

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
      "WebAuthenticationViewForMac.start - id=\(sessionId) didStart=\(didStart) callbackURLScheme=\(callbackURLScheme) url=\(redactOAuthUrl(url))"
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
      for window in NSApplication.shared.windows {
        if window.isKeyWindow {
          return window
        }
      }
      return NSApplication.shared.windows.first ?? ASPresentationAnchor()
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
