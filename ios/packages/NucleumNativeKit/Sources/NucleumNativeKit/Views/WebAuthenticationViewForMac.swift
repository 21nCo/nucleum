import AuthenticationServices
import SwiftUI

struct WebAuthenticationView: NSViewRepresentable {
  let url: URL
  let callbackURLScheme: String
  let completionHandler: (URL?, Error?) -> Void

  // Store the authentication session to prevent it from being deallocated
  class AuthSessionContainer {
    var session: ASWebAuthenticationSession?
    var isCompleting = false
  }

  // Use a static variable to maintain the session across view updates
  private static var authSessionContainer = AuthSessionContainer()

  func makeNSView(context: Context) -> NSView {
    Log.info("AuthSessionContainer.makeNSView - \(url)")
    return NSView()
  }

  func updateNSView(_ nsView: NSView, context: Context) {
    Log.info("AuthSessionContainer.updateNSView - \(url)")

    // Skip creating a new session if we're in the completion phase
    // or if we already have an active session
    if WebAuthenticationView.authSessionContainer.isCompleting
      || WebAuthenticationView.authSessionContainer.session != nil
    {
      return
    }

    // Create and configure the new auth session
    let authSession = ASWebAuthenticationSession(
      url: url,
      callbackURLScheme: callbackURLScheme,
      completionHandler: { url, error in
        // Mark as completing to prevent new sessions during state updates
        WebAuthenticationView.authSessionContainer.isCompleting = true

        // Handle the completion
        self.completionHandler(url, error)

        // Clear the session after completion
        WebAuthenticationView.authSessionContainer.session = nil

        // Reset the completing flag after a short delay to allow any pending updates to process
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
          WebAuthenticationView.authSessionContainer.isCompleting = false
        }

        Log.info("AuthSessionContainer.updateNSView - \(url) - completionHandler")
      }
    )

    // Configure the session
    authSession.prefersEphemeralWebBrowserSession = false
    authSession.presentationContextProvider = context.coordinator

    // Store the session
    WebAuthenticationView.authSessionContainer.session = authSession

    // Start the session
    authSession.start()
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
