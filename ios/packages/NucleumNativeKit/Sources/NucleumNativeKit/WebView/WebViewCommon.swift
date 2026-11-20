//
//  webViewCommon.swift
//  Pointron
//
//  Created by Ar on 3/9/24.
//
import Combine
import Foundation
import SwiftUI
import UniformTypeIdentifiers
import WebKit

let customProtocol = "tauri"

enum WebUrlType {
  case localUrl, publicUrl, customProtocolUrl
}

class CustomURLSchemeHandler: NSObject, WKURLSchemeHandler {
  var isSheet: Bool = false
  init(isSheet: Bool) {
    self.isSheet = isSheet
  }
  func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
    guard let url = urlSchemeTask.request.url else {
      urlSchemeTask.didFailWithError(
        NSError(domain: NSURLErrorDomain, code: NSURLErrorBadURL, userInfo: nil))
      return
    }

    // Remove '@' symbol if present at the beginning of the URL
    // if url.absoluteString.hasPrefix("@") {
    //   let urlString = String(url.absoluteString.dropFirst())
    //   url = URL(string: urlString) ?? url
    // }

    let path = url.path == "/" ? "/index.html" : url.path
    let host = url.host
    let customProtocolInContext = url.scheme
    print(
      "CustomURLSchemeHandler - start - \(customProtocolInContext)://\(host ?? "")\(path) - \(url)")
    guard let resourcePath = Bundle.main.resourcePath else {
      urlSchemeTask.didFailWithError(
        NSError(domain: NSURLErrorDomain, code: NSURLErrorFileDoesNotExist, userInfo: nil))
      return
    }
    let directoryPath = isSheet ? "/sheet" : "/www"
    guard let fileURL = bundledWebFileURL(
      resourcePath: resourcePath,
      directoryPath: directoryPath,
      requestPath: path
    ) else {
      urlSchemeTask.didFailWithError(
        NSError(domain: NSURLErrorDomain, code: NSURLErrorNoPermissionsToReadFile, userInfo: nil))
      return
    }
    let filePath = fileURL.path
    //    print("CustomURLSchemeHandler - filePath: \(filePath), path: \(path), host: \(host)")
    do {
      if customProtocolInContext != customProtocol {
        urlSchemeTask.didFailWithError(
          NSError(domain: NSURLErrorDomain, code: NSURLErrorUnsupportedURL, userInfo: nil))
        print("CustomURLSchemeHandler - unsupported protocol: \(url)")
        return
      }
      let mimeType = mimeTypeForPath(path: filePath)
      // Read the file data.
      let data = try Data(contentsOf: fileURL)
      let headers = [
        "Content-Type": mimeType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      ]
      let response = HTTPURLResponse(
        url: url, statusCode: 200, httpVersion: nil, headerFields: headers)!

      urlSchemeTask.didReceive(response)
      urlSchemeTask.didReceive(data)
      urlSchemeTask.didFinish()
    } catch {
      urlSchemeTask.didFailWithError(
        NSError(domain: NSURLErrorDomain, code: NSURLErrorCannotOpenFile, userInfo: nil))
      print("CustomURLSchemeHandler - error: \(error)")

    }
  }

  func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
    // on stopping of the task
  }

  //  func mimeTypeForPath(path: String) -> String {
  //    let url = URL(fileURLWithPath: path)
  //    let pathExtension = url.pathExtension
  //
  //    if let uti = UTTypeCreatePreferredIdentifierForTag(
  //      kUTTagClassFilenameExtension, pathExtension as CFString, nil)?.takeRetainedValue()
  //    {
  //      if let mimetype = UTTypeCopyPreferredTagWithClass(uti, kUTTagClassMIMEType)?
  //        .takeRetainedValue()
  //      {
  //        return mimetype as String
  //      }
  //    }
  //    return "application/octet-stream"
  //  }

  func mimeTypeForPath(path: String) -> String {
    let url = URL(fileURLWithPath: path)
    let pathExtension = url.pathExtension

    if let utType = UTType(filenameExtension: pathExtension) {
      if let mimeType = utType.preferredMIMEType {
        return mimeType
      }
    }

    return "application/octet-stream"
  }

}

func createUrlForCustomProtocol(with parameters: [String: String]) -> URL {
  guard var components = URLComponents(string: "\(customProtocol)://localhost/index.html") else {
    preconditionFailure("Invalid bundled custom protocol base URL")
  }
  components.queryItems = parameters.map { URLQueryItem(name: $0.key, value: $0.value) }
  guard let url = components.url else {
    preconditionFailure("Invalid bundled custom protocol URL parameters")
  }
  return url
}

func createUrlForPublicProtocol(url: String, with parameters: [String: String]) -> URL {
  guard var components = URLComponents(string: url),
    let baseUrl = components.url,
    isAllowedExternalUrl(baseUrl)
  else {
    return createUrlForCustomProtocol(with: parameters)
  }
  components.queryItems = parameters.map { URLQueryItem(name: $0.key, value: $0.value) }
  return components.url ?? baseUrl
}

func isAllowedExternalUrl(_ url: URL, allowLocalHttp: Bool = true) -> Bool {
  guard let scheme = url.scheme?.lowercased() else { return false }
  if scheme == "https" { return true }
  if scheme == customProtocol { return true }
  guard allowLocalHttp, scheme == "http" else { return false }
  let host = url.host?.lowercased()
  return host == "localhost" || host == "127.0.0.1" || host == "::1"
}

private func bundledWebFileURL(
  resourcePath: String,
  directoryPath: String,
  requestPath: String
) -> URL? {
  let trimmedPath = requestPath.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
  if trimmedPath.isEmpty || trimmedPath.contains("..") || trimmedPath.contains("\0") {
    return nil
  }

  let rootURL = URL(fileURLWithPath: resourcePath)
    .appendingPathComponent(directoryPath.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
    .standardizedFileURL
  let fileURL = rootURL.appendingPathComponent(trimmedPath).standardizedFileURL
  let rootPath = rootURL.path.hasSuffix("/") ? rootURL.path : rootURL.path + "/"
  guard fileURL.path.hasPrefix(rootPath) else { return nil }
  return fileURL
}

protocol WebViewHandlerDelegate {
  func receivedJsonValueFromWebView(value: [String: Any?])
  func receivedStringValueFromWebView(value: String)
  func reloadWebView()
}

class WebViewModel: ObservableObject {
  // @Published var refreshId: String = TimeUtils.getCurrentTimeInUTC()
  //  var webViewNavigationPublisher = PassthroughSubject<WebViewNavigation, Never>()
  var messageFromSource = PassthroughSubject<[String: Any?], Never>()
  var showLoader = PassthroughSubject<Bool, Never>()
  var reloadEvent = PassthroughSubject<Bool, Never>()
  var valuePublisher = PassthroughSubject<String, Never>()
}

// MARK: - NativeTrust (begin)
/// Decides which origins, navigations and account URLs the native shell trusts.
/// Pure functions over explicit inputs so they can be checked without a WebView.
enum NativeTrust {
  /// Hosts the shell's own account service can live on: the product account
  /// domain and its subdomains, or `<product>-account-<region>` on the dev zone.
  static func isTrustedAccountURL(
    _ url: URL, accountDomain: String, devHostZone: String, productLabel: String
  ) -> Bool {
    guard url.scheme?.lowercased() == "https", let host = url.host?.lowercased(), !host.isEmpty
    else { return false }
    if url.user != nil || url.password != nil { return false }
    let domain = normalizedDomain(accountDomain)
    if host == domain || host.hasSuffix(".\(domain)") { return true }
    let zone = normalizedDomain(devHostZone)
    return host.hasSuffix(".\(zone)")
      && host.hasPrefix("\(productLabel.lowercased())-account-")
      && host.dropLast(zone.count + 1).contains(".") == false
  }

  /// True when a frame's origin is one the app itself is served from.
  static func isTrustedFrameOrigin(
    scheme: String, host: String, port: Int, trustedOrigins: [URL]
  ) -> Bool {
    let scheme = scheme.lowercased()
    let host = host.lowercased()
    return trustedOrigins.contains { origin in
      origin.scheme?.lowercased() == scheme
        && (origin.host?.lowercased() ?? "") == host
        && effectivePort(origin.port, scheme: scheme) == effectivePort(port == 0 ? nil : port, scheme: scheme)
    }
  }

  enum NavigationDecision: Equatable {
    case allow
    case openExternally
    case cancel
  }

  /// Main-frame navigations stay in the WebView only for the app's own origins,
  /// its account hosts and in-page schemes; other web links open in the system
  /// browser, and anything else is cancelled.
  static func mainFrameNavigationDecision(
    for url: URL, trustedOrigins: [URL], isTrustedAccountURL: (URL) -> Bool
  ) -> NavigationDecision {
    let scheme = url.scheme?.lowercased() ?? ""
    if scheme == "about" || scheme == "blob" { return .allow }
    if trustedOrigins.contains(where: { sameOrigin($0, url) }) { return .allow }
    if scheme == "https" && isTrustedAccountURL(url) { return .allow }
    if scheme == "http" || scheme == "https" || scheme == "mailto" || scheme == "tel" {
      return .openExternally
    }
    return .cancel
  }

  /// A sign-in deep link is `<app scheme>://oauthsignin` (case-insensitive host).
  static func isSignInDeepLink(_ url: URL, appScheme: String) -> Bool {
    url.scheme?.lowercased() == appScheme.lowercased() && url.host?.lowercased() == "oauthsignin"
  }

  static func sameOrigin(_ left: URL, _ right: URL) -> Bool {
    let scheme = left.scheme?.lowercased() ?? ""
    return scheme == (right.scheme?.lowercased() ?? "")
      && (left.host?.lowercased() ?? "") == (right.host?.lowercased() ?? "")
      && effectivePort(left.port, scheme: scheme) == effectivePort(right.port, scheme: scheme)
  }

  private static func effectivePort(_ port: Int?, scheme: String) -> Int? {
    if let port { return port }
    switch scheme {
    case "https": return 443
    case "http": return 80
    default: return nil
    }
  }

  private static func normalizedDomain(_ domain: String) -> String {
    let trimmed = domain.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    return trimmed.hasPrefix(".") ? String(trimmed.dropFirst()) : trimmed
  }
}
// MARK: - NativeTrust (end)

extension NativeTrust {
  /// Origins the app's own web layer is served from.
  static func appTrustedOrigins(loadedURL: URL?) -> [URL] {
    var origins: [URL] = []
    if let bundled = URL(string: "\(customProtocol)://localhost") { origins.append(bundled) }
    if let web = URL(string: LocalConfig.webOrigin) { origins.append(web) }
    if let loadedURL, loadedURL.scheme?.lowercased() != customProtocol { origins.append(loadedURL) }
    return origins
  }

  /// Account URLs the native side may send the session token to.
  static func isAppAccountURL(_ url: URL) -> Bool {
    isTrustedAccountURL(
      url,
      accountDomain: LocalConfig.accountDomain,
      devHostZone: LocalConfig.devHostZone,
      productLabel: LocalConfig.productLabel
    )
  }

  /// Accepts bridge messages only from the main frame of an app origin.
  static func acceptsBridgeMessage(_ message: WKScriptMessage, loadedURL: URL?) -> Bool {
    guard message.frameInfo.isMainFrame else { return false }
    let origin = message.frameInfo.securityOrigin
    return isTrustedFrameOrigin(
      scheme: origin.protocol,
      host: origin.host,
      port: origin.port,
      trustedOrigins: appTrustedOrigins(loadedURL: loadedURL)
    )
  }
}

