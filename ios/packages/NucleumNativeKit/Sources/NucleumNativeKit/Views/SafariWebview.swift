import AuthenticationServices
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

  func makeUIViewController(context: Context) -> UIViewController {
    return UIViewController()
  }

  func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
    let authSession = ASWebAuthenticationSession(
      url: url,
      callbackURLScheme: callbackURLScheme,
      completionHandler: completionHandler
    )
    authSession.prefersEphemeralWebBrowserSession = false
    authSession.presentationContextProvider = context.coordinator
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
      let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene
      return scene?.windows.first ?? ASPresentationAnchor()
    }
  }
}
