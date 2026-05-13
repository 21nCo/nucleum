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
