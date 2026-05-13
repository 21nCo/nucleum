//
//  CustomWebView.swift
//  Pointron
//
//  Created by Ar on 10/9/23.
//

import Foundation
import SwiftUI
import WebKit

class NavigationState: ObservableObject {
  @Published var url: URL?
}

struct CustomWebView: UIViewRepresentable {
  let url: URL
  var navigationState: NavigationState

  func makeCoordinator() -> Coordinator {
    return Coordinator()
  }
  func makeUIView(context: Self.Context) -> WKWebView {
    let preferences = WKWebpagePreferences()
    preferences.allowsContentJavaScript = true
    let config = WKWebViewConfiguration()
    config.defaultWebpagePreferences = preferences
    let webView = WKWebView(frame: .zero, configuration: config)
    context.coordinator.navigationState = navigationState
    webView.navigationDelegate = context.coordinator
    if isAllowedExternalUrl(url) {
      webView.load(URLRequest(url: url))
    }
    return webView
  }
  func updateUIView(_ uiView: WKWebView, context: Self.Context) {
    guard isAllowedExternalUrl(url) else { return }
    if uiView.url != url {
      uiView.load(URLRequest(url: url))
    }
  }
  class Coordinator: NSObject, WKNavigationDelegate {
    var navigationState: NavigationState?

    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
      navigationState?.url = webView.url
    }
  }
}

//class WebViewThree: NSObject, ObservableObject, UIViewRepresentable {
//  @Published var isLoading = false
//  private let webView = WKWebView()
//
//  func makeUIView(context: Context) -> WKWebView {
//    webView.navigationDelegate = context.coordinator
//    return webView
//  }
//
//  func updateUIView(_ uiView: WKWebView, context: Context) {}
//
//  func load(_ request: URLRequest) {
//    webView.load(request)
//  }
//
//  func makeCoordinator() -> Coordinator {
//    Coordinator(self)
//  }
//
//  class Coordinator: NSObject, WKNavigationDelegate {
//    private let parent: WebViewThree
//
//    init(_ parent: WebViewThree) {
//      self.parent = parent
//    }
//
//    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
//      parent.isLoading = true
//    }
//
//    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
//      parent.isLoading = false
//    }
//
//    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
//      parent.isLoading = false
//    }
//
//    func webView(
//      _ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!,
//      withError error: Error
//    ) {
//      parent.isLoading = false
//    }
//  }
//}
