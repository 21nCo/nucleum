//
//  WebViewTwo.swift
//  Pointron
//
//  Created by Ar on 10/12/23.
//

import Combine
import Foundation
import SwiftUI

#if os(iOS)
  import UIKit
  import WebKit
#endif

/// For identifiying WebView's forward and backward navigation
enum WebViewNavigation {
  case backward, forward, reload
}

class CustomWKWebViewThree: WKWebView {
  private var keyboardAdjustmentWorkItem: DispatchWorkItem?
  private var originalContentInset: UIEdgeInsets = .zero
  var shouldShowCharacterToolbar: Bool = false

  lazy var characterToolbar: UIView = {
    let toolbar = UIToolbar(
      frame: CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 44))

    let characters = ["#", "*", "\"", "!", "-", "[]"]
    var toolbarItems: [UIBarButtonItem] = []

    for character in characters {
      let button = UIBarButtonItem(
        title: character,
        style: .plain,
        target: self,
        action: #selector(insertCharacter(_:))
      )
      toolbarItems.append(button)

      if character != characters.last {
        toolbarItems.append(UIBarButtonItem(systemItem: .flexibleSpace))
      }
    }

    toolbarItems.append(UIBarButtonItem(systemItem: .flexibleSpace))
    toolbarItems.append(
      UIBarButtonItem(
        title: "Done",
        style: .done,
        target: self,
        action: #selector(dismissKeyboard)
      ))

    toolbar.items = toolbarItems
    return toolbar
  }()

  lazy var defaultToolbar: UIView = {
    let toolbar = UIToolbar(
      frame: CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 44))
    toolbar.items = [
      UIBarButtonItem(systemItem: .flexibleSpace),
      UIBarButtonItem(
        title: "Done", style: .done, target: self, action: #selector(dismissKeyboard)
      ),
    ]
    return toolbar
  }()

  override var inputAccessoryView: UIView? {
    return shouldShowCharacterToolbar ? characterToolbar : defaultToolbar
  }

  override init(frame: CGRect, configuration: WKWebViewConfiguration) {
    super.init(frame: frame, configuration: configuration)
    setupWebView()
    setupKeyboardObservers()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setupWebView()
    setupKeyboardObservers()
  }

  private func setupWebView() {
    scrollView.contentInsetAdjustmentBehavior = .never
    scrollView.automaticallyAdjustsScrollIndicatorInsets = false
    scrollView.bounces = false
    scrollView.keyboardDismissMode = .none
    originalContentInset = scrollView.contentInset
  }

  private func setupKeyboardObservers() {
    NotificationCenter.default.addObserver(
      self, selector: #selector(keyboardWillShow),
      name: UIResponder.keyboardWillShowNotification, object: nil)
    NotificationCenter.default.addObserver(
      self, selector: #selector(keyboardWillHide),
      name: UIResponder.keyboardWillHideNotification, object: nil)
  }

  @objc private func keyboardWillShow(_ notification: Notification) {
    guard
      let keyboardFrame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect
    else { return }

    keyboardAdjustmentWorkItem?.cancel()

    keyboardAdjustmentWorkItem = DispatchWorkItem { [weak self] in
      guard let self = self else { return }

      self.evaluateJavaScript(
        """
          (function() {
            let focused = document.activeElement;
            if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA' || focused.contentEditable === 'true')) {
              let rect = focused.getBoundingClientRect();
              let hasInlineMarkdownClass = focused.classList && focused.classList.contains('inline-markdown');
              return {
                bottom: rect.bottom,
                viewportHeight: window.innerHeight,
                hasInlineMarkdownClass: hasInlineMarkdownClass
              };
            }
            return null;
          })();
        """
      ) { [weak self] result, error in
        guard let self = self else {
          self?.scrollView.contentInset = self?.originalContentInset ?? .zero
          return
        }

        guard let data = result as? [String: Any],
          let elementBottom = data["bottom"] as? Double,
          let viewportHeight = data["viewportHeight"] as? Double
        else {
          self.scrollView.contentInset = self.originalContentInset
          self.shouldShowCharacterToolbar = false
          self.reloadInputViews()
          return
        }

        let hasInlineMarkdownClass = data["hasInlineMarkdownClass"] as? Bool ?? false
        self.shouldShowCharacterToolbar = hasInlineMarkdownClass
        self.reloadInputViews()

        let keyboardStart = viewportHeight - Double(keyboardFrame.height)

        DispatchQueue.main.async {
          if elementBottom > keyboardStart {
            let adjustment = elementBottom - keyboardStart + 20
            self.scrollView.contentInset.bottom = max(0, CGFloat(adjustment))
          } else {
            self.scrollView.contentInset = self.originalContentInset
          }
        }
      }
    }

    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3, execute: keyboardAdjustmentWorkItem!)
  }

  @objc private func keyboardWillHide(_ notification: Notification) {
    keyboardAdjustmentWorkItem?.cancel()
    scrollView.contentInset = originalContentInset
    scrollView.contentInsetAdjustmentBehavior = .never
    shouldShowCharacterToolbar = false
    reloadInputViews()
  }

  @objc private func insertCharacter(_ sender: UIBarButtonItem) {
    guard let character = sender.title else { return }

    let jsCode = """
        (function() {
          let focused = document.activeElement;
          if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA' || focused.contentEditable === 'true')) {
            if (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA') {
              let start = focused.selectionStart;
              let end = focused.selectionEnd;
              let value = focused.value;
              focused.value = value.slice(0, start) + '\(character)' + value.slice(end);
              focused.selectionStart = focused.selectionEnd = start + 1;
            } else if (focused.contentEditable === 'true') {
              document.execCommand('insertText', false, '\(character)');
            }
            
            let event = new Event('input', { bubbles: true });
            focused.dispatchEvent(event);
          }
        })();
      """

    evaluateJavaScript(jsCode) { result, error in
      if let error = error {
        print("Error inserting character: \(error.localizedDescription)")
      }
    }
  }

  @objc private func dismissKeyboard() {
    endEditing(true)
  }

  deinit {
    keyboardAdjustmentWorkItem?.cancel()
    NotificationCenter.default.removeObserver(self)
  }
}

class CustomWKWebViewTwo: WKWebView {
  var hideKeyboardToolbar: Bool = false
  private var keyboardHeight: CGFloat = 0
  private var originalContentInset: UIEdgeInsets = .zero
  private var isAdjustingForKeyboard = false
  private var lastKnownContentOffset: CGPoint = .zero
  private var lastKnownContentInset: UIEdgeInsets = .zero

  lazy var toolbar: UIView = {
    let toolbar = UIToolbar(
      frame: CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 44))
    toolbar.items = [
      UIBarButtonItem(systemItem: .flexibleSpace),
      UIBarButtonItem(systemItem: .flexibleSpace),
      UIBarButtonItem(
        title: "Close", style: .done, target: self, action: #selector(dismissKeyboard)),
    ]
    return toolbar
  }()

  override var inputAccessoryView: UIView? {
    return hideKeyboardToolbar ? nil : toolbar
  }

  override init(frame: CGRect, configuration: WKWebViewConfiguration) {
    super.init(frame: frame, configuration: configuration)
    setupWebView()
    setupKeyboardObservers()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setupWebView()
    setupKeyboardObservers()
  }

  private func setupWebView() {
    scrollView.contentInsetAdjustmentBehavior = .never
    scrollView.automaticallyAdjustsScrollIndicatorInsets = false
    scrollView.bounces = false
    scrollView.keyboardDismissMode = .none
    originalContentInset = scrollView.contentInset

    if #available(iOS 13.0, *) {
      scrollView.automaticallyAdjustsScrollIndicatorInsets = false
    }
  }

  private func setupKeyboardObservers() {
    NotificationCenter.default.addObserver(
      self, selector: #selector(keyboardWillShow),
      name: UIResponder.keyboardWillShowNotification, object: nil)
    NotificationCenter.default.addObserver(
      self, selector: #selector(keyboardWillHide),
      name: UIResponder.keyboardWillHideNotification, object: nil)

    startScrollViewMonitoring()
  }

  private func startScrollViewMonitoring() {
    Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] timer in
      guard let self = self else {
        timer.invalidate()
        return
      }

      let currentOffset = self.scrollView.contentOffset
      let currentInset = self.scrollView.contentInset

      if self.keyboardHeight > 0 && !self.isAdjustingForKeyboard {
        if currentOffset != self.lastKnownContentOffset
          || currentInset != self.lastKnownContentInset
        {
          Log.info(
            "External scroll adjustment detected - offset: \(currentOffset) vs \(self.lastKnownContentOffset), inset: \(currentInset) vs \(self.lastKnownContentInset)"
          )

          DispatchQueue.main.async {
            self.scrollView.contentInset = self.originalContentInset
            if currentOffset.y != 0 {
              self.scrollView.setContentOffset(.zero, animated: false)
              Log.info("Reverted external scroll adjustment")
            }
          }
        }
      }

      self.lastKnownContentOffset = currentOffset
      self.lastKnownContentInset = currentInset
    }
  }

  private func adjustScrollViewForKeyboard(keyboardFrame: CGRect) {
    guard !isAdjustingForKeyboard else { return }
    isAdjustingForKeyboard = true

    evaluateJavaScript(
      """
        (function() {
          let focused = document.activeElement;
          if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA' || focused.contentEditable === 'true')) {
            let rect = focused.getBoundingClientRect();
            return {
              top: rect.top,
              bottom: rect.bottom,
              viewportHeight: window.innerHeight
            };
          }
          return null;
        })();
      """
    ) { [weak self] result, error in
      guard let self = self else {
        self?.isAdjustingForKeyboard = false
        return
      }

      defer { self.isAdjustingForKeyboard = false }

      guard let data = result as? [String: Any] else {
        Log.info("No focused input element found")
        return
      }

      let elementBottom = data["bottom"] as? Double ?? 0
      let viewportHeight = data["viewportHeight"] as? Double ?? 0
      let keyboardStart = viewportHeight - Double(keyboardFrame.height)

      Log.info(
        "Keyboard adjustment check - elementBottom: \(elementBottom), keyboardStart: \(keyboardStart), condition: \(elementBottom > keyboardStart)"
      )

      DispatchQueue.main.async {
        if elementBottom > keyboardStart {
          let adjustment = elementBottom - keyboardStart + 20
          Log.info("Adjusting scroll view by: \(adjustment)px")
          self.scrollView.contentInset.bottom = max(0, CGFloat(adjustment))
          self.scrollView.setContentOffset(
            CGPoint(x: 0, y: self.scrollView.contentOffset.y + CGFloat(adjustment)),
            animated: true
          )
        } else {
          Log.info("No adjustment needed - element is not obscured by keyboard")
        }
      }
    }
  }

  @objc private func keyboardWillShow(_ notification: Notification) {
    guard
      let keyboardFrame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect
    else { return }
    keyboardHeight = keyboardFrame.height
    Log.info("Keyboard will show - height: \(keyboardHeight)")

    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
      self.adjustScrollViewForKeyboard(keyboardFrame: keyboardFrame)
    }
  }

  @objc private func keyboardWillHide(_ notification: Notification) {
    Log.info("Keyboard will hide - resetting content inset")
    keyboardHeight = 0
    isAdjustingForKeyboard = false
    scrollView.contentInset = originalContentInset
  }

  @objc func dismissKeyboard() {
    self.endEditing(true)
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }
}

/// Add this class before the WebViewTwo struct
class CustomWKWebView: WKWebView {
  var hideKeyboardToolbar: Bool = false

  lazy var toolbar: UIView = {
    let toolbar = UIToolbar(
      frame: CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 44))
    toolbar.items = [
      UIBarButtonItem(systemItem: .flexibleSpace),
      UIBarButtonItem(systemItem: .flexibleSpace),
      UIBarButtonItem(
        title: "Done", style: .done, target: self, action: #selector(dismissKeyboard)),
    ]
    return toolbar
  }()

  override var inputAccessoryView: UIView? {
    return hideKeyboardToolbar ? nil : toolbar
  }

  override init(frame: CGRect, configuration: WKWebViewConfiguration) {
    super.init(frame: frame, configuration: configuration)
    setupWebView()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setupWebView()
  }

  private func setupWebView() {
    scrollView.contentInsetAdjustmentBehavior = .never
    scrollView.automaticallyAdjustsScrollIndicatorInsets = false
    scrollView.bounces = false
  }

  @objc func dismissKeyboard() {
    self.endEditing(true)
  }
}

/// A struct that represents a web view.
///
/// refreshId: A unique identifier for refreshing the web view. Changing this value will trigger a web view refresh.
/// webView: A WKWebView instance.
/// url: A URL instance.
/// params: A dictionary of parameters to be passed to the web view. example: ["debug": "true"]
struct WebViewTwo: UIViewRepresentable, WebViewHandlerDelegate {
  var urlType: WebUrlType = .customProtocolUrl
  @State var refreshId: String
  @State var webView: WKWebView?
  @State private var lastReloadTime: Date = Date.distantPast
  let url: URL
  var params: [String: String]
  let isSheet: Bool
  @ObservedObject var viewModel: WebViewModel
  var hideKeyboardToolbar: Bool = false

  func receivedJsonValueFromWebView(value: [String: Any?]) {
    // Log.info("JSON value received from web is: \(value)")
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
    //Log.info("String value received from web is: \(value)")
    self.viewModel.messageFromSource.send(["value": value])
  }

  func reloadWebView() {
    self.refreshId = TimeUtils.getCurrentTimeInUTC()
    self.viewModel.reloadEvent.send(true)
  }

  func makeCoordinator() -> Coordinator {
    Coordinator(self)
  }

  func makeUIView(context: Context) -> WKWebView {
    Log.info(
      "makeUIView - refreshId: \(refreshId)"
    )
    let preferences = WKPreferences()
    preferences.javaScriptEnabled = true
    let configuration = WKWebViewConfiguration()

    configuration.websiteDataStore = WKWebsiteDataStore.default()
    configuration.limitsNavigationsToAppBoundDomains = false
    configuration.allowsInlineMediaPlayback = true
    configuration.mediaTypesRequiringUserActionForPlayback = []
    configuration.mediaPlaybackRequiresUserAction = false

    configuration.userContentController.add(self.makeCoordinator(), name: "iOSNative")
    if let nativeConfigScript = makeNativeConfigUserScript() {
      configuration.userContentController.addUserScript(nativeConfigScript)
    }
    configuration.preferences = preferences
    if urlType == .customProtocolUrl {
      configuration.setURLSchemeHandler(
        CustomURLSchemeHandler(isSheet: isSheet), forURLScheme: customProtocol)
    }
    let webView = CustomWKWebViewThree(frame: CGRect.zero, configuration: configuration)
    // webView.hideKeyboardToolbar = hideKeyboardToolbar
    self.webView = webView
    webView.navigationDelegate = context.coordinator
    webView.uiDelegate = context.coordinator
    webView.allowsBackForwardNavigationGestures = false
    webView.configuration.allowsInlineMediaPlayback = true
    webView.scrollView.isScrollEnabled = true
    // webView.mediaPlaybackRequiresUserAction = false
    //    webView.scrollView.keyboardDismissMode = .onDrag
    webView.allowsLinkPreview = false
    var device = ""
    if UIDevice.current.userInterfaceIdiom == .phone {
      device = "handset"
    } else if UIDevice.current.userInterfaceIdiom == .pad {
      device = "tablet"
    }
    webView.customUserAgent = "Blank - Tidigit - Apple iOS - \(device) - embed"

    // Disable all keyboard notifications
    // Disabling these will prevent the keyboard pushing the text input field into the view
    // NotificationCenter.default.removeObserver(
    //   webView, name: UIResponder.keyboardWillChangeFrameNotification, object: nil)
    // NotificationCenter.default.removeObserver(
    //   webView, name: UIResponder.keyboardWillShowNotification, object: nil)
    // NotificationCenter.default.removeObserver(
    //   webView, name: UIResponder.keyboardWillHideNotification, object: nil)

    return webView
  }

  private func makeNativeConfigUserScript() -> WKUserScript? {
    let config: [String: String] = [
      "webOrigin": LocalConfig.webOrigin,
      "accountUrl": LocalConfig.accountUrl,
      "accountDomain": LocalConfig.accountDomain,
      "debugSinkUrl": LocalConfig.debugSinkUrl,
      "defaultRegion": LocalConfig.defaultRegion,
      "environment": LocalConfig.environment,
      "product": LocalConfig.product,
    ]
    guard
      let data = try? JSONSerialization.data(withJSONObject: config, options: []),
      let json = String(data: data, encoding: .utf8)
    else {
      Log.error(message: "Unable to serialize native web config")
      return nil
    }
    Log.info("Injecting native web config for \(LocalConfig.defaultAppName): webOrigin=\(LocalConfig.webOrigin), accountUrl=\(LocalConfig.accountUrl), nativeAppleIntercept=enabled")
    return WKUserScript(
      source: "window.__NUCLEUM_NATIVE_CONFIG__ = \(json);",
      injectionTime: .atDocumentStart,
      forMainFrameOnly: false
    )
  }

  func updateUIView(_ webView: WKWebView, context: Context) {
    // if let customWebView = webView as? WKWebView {
    //   customWebView.hideKeyboardToolbar = hideKeyboardToolbar
    // }
    Log.info(
      "updateUIView -  webView.isLoading: \(webView.isLoading) url: \(url) refreshId: \(refreshId)"
    )
    if urlType == .customProtocolUrl {
      Log.info("updateUIView -  reloading custom protocol url - refreshId: \(refreshId)")
      let url = createUrlForCustomProtocol(with: params)
      webView.load(URLRequest(url: url))
      Log.info(
        "updateUIView -  reload complete for custom protocol url - refreshId: \(refreshId)")
    } else {
      let url = createUrlForPublicProtocol(url: url.absoluteString, with: params)
      webView.load(URLRequest(url: url))
    }
  }

  class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
    var parent: WebViewTwo
    var delegate: WebViewHandlerDelegate?
    var valueSubscriber: AnyCancellable? = nil
    var webViewNavigationSubscriber: AnyCancellable? = nil
    var navigationCompletedSuccessfully = false
    init(_ uiWebView: WebViewTwo) {
      self.parent = uiWebView
      self.delegate = parent
      super.init()
      let notificationCenter = NotificationCenter.default
      let notificationName = UIApplication.willEnterForegroundNotification
      notificationCenter.removeObserver(self, name: notificationName, object: nil)
      notificationCenter.addObserver(
        self,
        selector: #selector(appWillEnterForeground),
        name: UIApplication.willEnterForegroundNotification,
        object: nil
      )
    }

    deinit {
      NotificationCenter.default.removeObserver(
        self, name: UIApplication.willEnterForegroundNotification, object: nil)
      valueSubscriber?.cancel()
      webViewNavigationSubscriber?.cancel()
    }

    @objc func appWillEnterForeground() {
      Log.info(
        "Coordinator enterFg notification listener: App is entering foreground - webView: \(parent.webView == nil) webView.isLoading: \(parent.webView?.isLoading ?? false) navigationCompletedSuccessfully: \(navigationCompletedSuccessfully)"
      )
      if let webView = parent.webView, webView.isLoading || !navigationCompletedSuccessfully {
        Log.info("WebView is no longer active - sending reload signal to webview...")
        //Reload
      }
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

          //Approach 1: escape sequences
          // let escapedValue = value.replacingOccurrences(of: "\"", with: "\\\"")
          //   .replacingOccurrences(of: "\n", with: "\\n").replacingOccurrences(of: "\r", with: "\\r")
          // let wrappedMessage = """
          //     {
          //         "type": "SWIFT_MESSAGE",
          //         "payload": "\(escapedValue)"
          //     }
          //   """
          // let javascriptFunction = "window.postMessage(\(wrappedMessage), \"*\")"
          // webView.evaluateJavaScript(javascriptFunction) { (response, error) in
          //   if let error = error {
          //     Log.error(
          //       message:
          //         "Error posting message - javascript:window.postMessage() error: \(error.localizedDescription)"
          //     )
          //     self.parent.reloadWebView()
          //   } else {
          //     Log.info(
          //       "Posted message successfully - javascript:window.postMessage() value: \(value)")
          //   }
          // }

          //Approach 2: Using JSONSerialization to convert the message to a JSON string
          let messageDict: [String: Any] = [
            "type": "SWIFT_MESSAGE",
            "payload": value,
          ]

          do {
            let jsonData = try JSONSerialization.data(withJSONObject: messageDict, options: [])
            if let jsonString = String(data: jsonData, encoding: .utf8) {
              let javascriptFunction = "window.postMessage(\(jsonString), \"*\")"
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
            } else {
              Log.error(message: "Failed to convert JSON data to string")
            }
          } catch {
            Log.error(message: "Failed to serialize message to JSON: \(error.localizedDescription)")
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
      _ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
      initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void
    ) {
      // Handle JavaScript alerts
      Log.info("JavaScript alert: \(message)")
      completionHandler()
    }

    func webView(
      _ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
      initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void
    ) {
      // Handle JavaScript confirm dialogs
      Log.info("JavaScript confirm: \(message)")
      completionHandler(true)
    }

    func webView(
      _ webView: WKWebView,
      requestMediaCapturePermissionFor origin: WKSecurityOrigin,
      initiatedByFrame frame: WKFrameInfo,
      type: WKMediaCaptureType,
      decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
      decisionHandler(.grant)
    }

    // func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
    //   parent.viewModel.showLoader.send(true)
    //   self.webViewNavigationSubscriber = self.parent.viewModel.webViewNavigationPublisher.receive(
    //     on: RunLoop.main
    //   ).sink(receiveValue: { navigation in
    //     switch navigation {
    //     case .backward:
    //       if webView.canGoBack {
    //         webView.goBack()
    //       }
    //     case .forward:
    //       if webView.canGoForward {
    //         webView.goForward()
    //       }
    //     case .reload:
    //       webView.reload()
    //     }
    //   })
    // }
    func webView(
      _ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
      decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
      if let host = navigationAction.request.url?.host {
        if host == "restricted.com" {
          decisionHandler(.cancel)
          return
        }
      }
      decisionHandler(.allow)
    }
  }
}

extension WebViewTwo.Coordinator: WKScriptMessageHandler {
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
