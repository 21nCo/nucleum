import Combine
import Foundation
import SwiftUI
import UniformTypeIdentifiers
import WebKit

struct WebViewForMac: NSViewRepresentable, WebViewHandlerDelegate {
  func makeCoordinator() -> Coordinator {
    Coordinator(self)
  }

  var urlType: WebUrlType = .localUrl
  let url: URL
  var params: [String: String]
  @State var refreshId: String
  @State private var lastReloadTime: Date = Date.distantPast
  @ObservedObject var viewModel: WebViewModel
  func reloadWebView() {
    self.refreshId = TimeUtils.getCurrentTimeInUTC()
  }
  func receivedJsonValueFromWebView(value: [String: Any?]) {
    if value.keys.contains("reload") {
      Log.info("Received reload signal from web")
      let currentTime = Date()
      let timeSinceLastReload = currentTime.timeIntervalSince(lastReloadTime)
      Log.info("Time since last reload: \(timeSinceLastReload)")
      if timeSinceLastReload >= 60.0 {
        lastReloadTime = currentTime
        self.reloadWebView()
      }
    }
    self.viewModel.messageFromSource.send(value)
  }

  func receivedStringValueFromWebView(value: String) {
    self.viewModel.messageFromSource.send(["value": value])
  }

  func makeNSView(context: Context) -> WKWebView {
    let preferences = WKPreferences()
    preferences.javaScriptEnabled = true
    let configuration = WKWebViewConfiguration()
    configuration.websiteDataStore = WKWebsiteDataStore.default()
    configuration.userContentController.add(self.makeCoordinator(), name: "iOSNative")
    configuration.mediaTypesRequiringUserActionForPlayback = []
    configuration.allowsAirPlayForMediaPlayback = true
    if let preferences = configuration.preferences as? WKWebpagePreferences {
      preferences.allowsContentJavaScript = true
    }
    configuration.preferences.setValue(true, forKey: "mediaDevicesEnabled")

    if urlType == .customProtocolUrl {
      configuration.setURLSchemeHandler(
        CustomURLSchemeHandler(isSheet: false), forURLScheme: customProtocol)
    }
    let webView = WKWebView(frame: .zero, configuration: configuration)
    webView.navigationDelegate = context.coordinator
    webView.uiDelegate = context.coordinator
    webView.allowsBackForwardNavigationGestures = false

    webView.customUserAgent = "Blank - Tidigit - Apple macOS - desktop - embed"
    return webView
  }

  func updateNSView(_ nsView: WKWebView, context: Context) {
    nsView.navigationDelegate = context.coordinator
    if urlType == .localUrl {
      let mainUrl = Bundle.main.bundleURL
      if let staticUrl = Bundle.main.url(
        forResource: "index2", withExtension: "html", subdirectory: "www")
      {
        nsView.loadFileURL(staticUrl, allowingReadAccessTo: staticUrl.deletingLastPathComponent())
        // let request = URLRequest(url: staticUrl)
        // nsView.load(request)
      }
    } else if urlType == .publicUrl {
      nsView.load(URLRequest(url: url))
    } else if urlType == .customProtocolUrl {
      let url = createUrlForCustomProtocol(with: params)
      nsView.load(URLRequest(url: url))
    }
  }

  class Coordinator: NSObject, WKNavigationDelegate, WKDownloadDelegate, WKUIDelegate {
    var parent: WebViewForMac
    var delegate: WebViewHandlerDelegate?
    var valueSubscriber: AnyCancellable? = nil
    var webViewNavigationSubscriber: AnyCancellable? = nil
    var navigationCompletedSuccessfully = false
    init(_ uiWebView: WebViewForMac) {
      self.parent = uiWebView
      self.delegate = parent
      super.init()
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
      webView.evaluateJavaScript("document.title") { (response, error) in
        if let error = error {
          Log.error(message: "Error getting title from webview: \(error.localizedDescription)")
        }
        guard let title = response as? String else {
          return
        }
        self.parent.viewModel.messageFromSource.send(["title": title])
      }

      valueSubscriber = parent.viewModel.valuePublisher.receive(on: RunLoop.main).sink(
        receiveValue: { value in
          let truncatedValue = value.count > 200 ? value.prefix(200) + "..." : value
          Log.info("Sending to web: \(truncatedValue)")
          let escapedValue = value.replacingOccurrences(of: "\"", with: "\\\"")
            .replacingOccurrences(of: "\n", with: "\\n").replacingOccurrences(of: "\r", with: "\\r")
          let wrappedMessage = """
              {
                  "type": "SWIFT_MESSAGE",
                  "payload": "\(escapedValue)"
              }
            """
          let javascriptFunction = "window.postMessage(\(wrappedMessage), \"*\")"
          webView.evaluateJavaScript(javascriptFunction) { (response, error) in
            if let error = error {
              Log.error(
                message:
                  "Error posting message - javascript:window.postMessage() error: \(error.localizedDescription)"
              )
              self.parent.reloadWebView()
            } else {
              Log.info(
                "Posted message successfully - javascript:window.postMessage() value: \(truncatedValue)"
              )
            }
          }
        })
      self.parent.viewModel.showLoader.send(false)
      navigationCompletedSuccessfully = true
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
      parent.viewModel.showLoader.send(false)
      navigationCompletedSuccessfully = false
    }

    func webView(
      _ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!,
      withError error: Error
    ) {
      Log.error(
        message:
          "didFailProvisionalNavigation - WebView failed to load with error: \(error.localizedDescription)"
      )
      navigationCompletedSuccessfully = false
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
      Log.error(
        message: "didFail - WebView failed to load with error: \(error.localizedDescription)")
      parent.viewModel.showLoader.send(false)
      parent.refreshId = TimeUtils.getCurrentTimeInUTC()
    }

    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
      parent.viewModel.showLoader.send(true)
    }

    func webView(
      _ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse,
      decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void
    ) {
      if navigationResponse.canShowMIMEType {
        decisionHandler(.allow)
      } else {
        decisionHandler(.download)
      }
    }

    func webView(
      _ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload
    ) {
      download.delegate = self
    }

    func download(
      _ download: WKDownload, decideDestinationUsing response: URLResponse,
      suggestedFilename: String,
      completionHandler: @escaping (URL?) -> Void
    ) {
      let savePanel = NSSavePanel()
      savePanel.nameFieldStringValue = suggestedFilename
      savePanel.begin { result in
        if result == .OK, let url = savePanel.url {
          completionHandler(url)
        } else {
          completionHandler(nil)
        }
      }
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
      print("Download failed: \(error.localizedDescription)")
    }

    func downloadDidFinish(_ download: WKDownload) {
      print("Download finished")
    }
    // func webView(
    //   _ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
    //   preferences: WKWebpagePreferences,
    //   decisionHandler: @escaping (WKNavigationActionPolicy, WKWebpagePreferences) -> Void
    // ) {
    //   if let url = navigationAction.request.url, url.absoluteString.starts(with: "blob:") {
    //     decisionHandler(.cancel, preferences)
    //     handleBlobURL(webView: webView, url: url)
    //   } else {
    //     decisionHandler(.allow, preferences)
    //   }
    // }

    // func handleBlobURL(webView: WKWebView, url: URL) {
    //   webView.evaluateJavaScript("fetch('\(url.absoluteString)').then(r => r.text())") {
    //     (result, error) in
    //     if let jsonString = result as? String {
    //       DispatchQueue.main.async {
    //         self.saveJSONFile(jsonString)
    //       }
    //     }
    //   }
    // }

    // func saveJSONFile(_ jsonString: String) {
    //   let savePanel = NSSavePanel()
    //   savePanel.allowedContentTypes = [UTType.json]
    //   savePanel.nameFieldStringValue = "data.json"
    //   savePanel.begin { result in
    //     if result == .OK, let url = savePanel.url {
    //       do {
    //         try jsonString.write(to: url, atomically: true, encoding: .utf8)
    //         print("File saved successfully")
    //       } catch {
    //         print("Failed to save file: \(error.localizedDescription)")
    //       }
    //     }
    //   }
    // }

    func webView(
      _ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
      preferences: WKWebpagePreferences,
      decisionHandler: @escaping (WKNavigationActionPolicy, WKWebpagePreferences) -> Void
    ) {
      if navigationAction.shouldPerformDownload {
        decisionHandler(.download, preferences)
      } else {
        decisionHandler(.allow, preferences)
      }
    }

    // func webView(
    //   _ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
    //   decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    // ) {
    //   if let host = navigationAction.request.url?.host {
    //     if host == "restricted.com" {
    //       decisionHandler(.cancel)
    //       return
    //     }
    //   }
    //   decisionHandler(.allow)
    // }
    func webView(
      _ webView: WKWebView,
      requestMediaCapturePermissionFor origin: WKSecurityOrigin,
      initiatedByFrame frame: WKFrameInfo,
      type: WKMediaCaptureType,
      decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
      decisionHandler(.grant)
    }

    func webView(
      _ webView: WKWebView,
      runOpenPanelWith parameters: WKOpenPanelParameters,
      initiatedByFrame frame: WKFrameInfo,
      completionHandler: @escaping ([URL]?) -> Void
    ) {

      let openPanel = NSOpenPanel()
      openPanel.canChooseFiles = true
      openPanel.canChooseDirectories = parameters.allowsDirectories
      openPanel.allowsMultipleSelection = parameters.allowsMultipleSelection
      openPanel.canCreateDirectories = true

      openPanel.begin { result in
        if result == .OK {
          completionHandler(openPanel.urls)
        } else {
          completionHandler(nil)
        }
      }
    }
  }
}

extension WebViewForMac.Coordinator: WKScriptMessageHandler {
  func userContentController(
    _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
  ) {
    if message.name == "iOSNative" {
      if let body = message.body as? [String: Any?] {
        delegate?.receivedJsonValueFromWebView(value: body)
      } else if let body = message.body as? String {
        delegate?.receivedStringValueFromWebView(value: body)
      }
    }
  }
}
