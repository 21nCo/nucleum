//
//  Logger.swift
//  Pointron
//
//  Created by Ar on 10/26/23.
//

import Foundation

#if os(iOS) || os(watchOS) || os(tvOS)
  import UIKit
#endif
struct Logger {
  static var shared = Logger()
  func log(message: String) {
    #if DEBUG
      print(message)
    #endif
  }
  func logError(message: String) {
    #if DEBUG
      print(message)
    #endif
  }
}
struct LogContext {
  let file: String
  let function: String
  let line: Int
  let isSaveToServer: Bool
  var desc: String {
    return "\((file as NSString).lastPathComponent):\(line) \(function)"
  }
  init(file: String, function: String, line: Int, isSaveToServer: Bool = true) {
    self.file = file
    self.function = function
    self.line = line
    self.isSaveToServer = isSaveToServer
  }
}

func redactUrlForLog(_ url: URL) -> String {
  guard var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
    return "[invalid-url]"
  }
  let sensitiveNames = Set([
    "token",
    "authfnToken",
    "authfnWidgetToken",
    "code",
    "state",
    "nonce",
    "id_token",
    "access_token",
    "refresh_token",
    "email",
    "identifier",
    "otp"
  ])
  components.queryItems = components.queryItems?.map { item in
    let name = item.name.lowercased()
    return sensitiveNames.contains(name)
      ? URLQueryItem(name: item.name, value: "[REDACTED]")
      : item
  }
  components.fragment = nil
  return components.string ?? "[redacted-url]"
}

func redactUrlForLog(_ urlString: String) -> String {
  guard let url = URL(string: urlString) else { return "[invalid-url]" }
  return redactUrlForLog(url)
}

enum Log {
  enum logType {
    case info
    case error
    fileprivate var desc: String {
      switch self {
      case .info: return "ℹ️ INFO: \(Date().timeIntervalSince1970)"
      case .error: return "❌ ERROR: \(Date().timeIntervalSince1970)"
      }
    }
    fileprivate var shortDesc: String {
      switch self {
      case .info: return "INFO"
      case .error: return "ERROR"
      }
    }
  }

  static func info(_ message: String, context: LogContext? = nil) {
    Log.log(logType: .info, message: message, context: context)
  }
  static func error(error: (any Error)? = nil, message: String = "", context: LogContext? = nil) {
    let resolvedMessage = message.isEmpty
      ? (error?.localizedDescription ?? "Unknown error")
      : message
    Log.log(
      logType: .error,
      message: resolvedMessage,
      context: context)
  }
	  fileprivate static func log(logType: logType, message: String, context: LogContext? = nil) {
	    let sanitizedMessage = sanitize(message)
	    var log = logType.desc + " " + sanitizedMessage
	    if let context {
	      log = log + " ➜ " + context.desc
	    }
    #if DEBUG
      if context?.isSaveToServer == true || context == nil { print(log) }
    #endif
    var os = "Apple - Undetermined"
    var device: String = "Apple - Undetermined"
    #if os(iOS)
      os = "iOS"
      device = UIDevice.current.model
    #elseif os(macOS)
      os = "mac"
      device = "macOS"
    #elseif os(tvOS)
      os = "tvOS"
      device = UIDevice.current.model
    #elseif os(watchOS)
      os = "watchOS"
      device = UIDevice.current.model
    #endif
    let osVersion = ProcessInfo.processInfo.operatingSystemVersion
	    #if DEBUG
	      if context?.isSaveToServer == true || context == nil {
	        sendToDebugSink(
	          logType: logType,
	          message: sanitizedMessage,
	          context: context,
	          os: os,
	          osVersion: "\(osVersion.majorVersion).\(osVersion.minorVersion).\(osVersion.patchVersion)",
	          device: device
	        )
	      }
	    #endif
	  }

	  fileprivate static func sendToDebugSink(
	    logType: logType,
	    message: String,
	    context: LogContext?,
	    os: String,
	    osVersion: String,
	    device: String
	  ) {
	    let sinkUrl = LocalConfig.debugSinkUrl.trimmingCharacters(in: .whitespacesAndNewlines)
	      .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
	    if sinkUrl.isEmpty { return }
	    guard let url = URL(string: "\(sinkUrl)/v1/logs") else { return }
	    let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
	    let payload: [String: Any] = [
	      "level": logType.shortDesc.lowercased(),
	      "source": "native",
	      "app": LocalConfig.defaultAppName,
	      "message": message,
	      "payload": [
	        "context": context?.desc ?? "",
	        "timestamp": "\(TimeUtils.getCurrentTimeInUTC())",
	      ],
	      "os": os,
	      "osVersion": osVersion,
	      "device": device,
	      "appVersion": version ?? "",
	    ]
	    guard JSONSerialization.isValidJSONObject(payload),
	      let body = try? JSONSerialization.data(withJSONObject: payload)
	    else { return }
	    var request = URLRequest(url: url)
	    request.httpMethod = "POST"
	    request.addValue("application/json", forHTTPHeaderField: "Content-Type")
	    request.httpBody = body
	    URLSession.shared.dataTask(with: request) { _, _, error in
	      if let error = error {
	        print("Debug sink log failed: \(error.localizedDescription)")
	      }
	    }.resume()
	  }

	  fileprivate static func sanitize(_ value: String) -> String {
	    var result = value
      let patterns: [(String, String)] = [
        ("(?i)(token|authfnToken|authfnWidgetToken|refreshToken|surrealToken)=([^&\\s]+)", "$1=[REDACTED]"),
        ("(?i)(code|state|id_token|access_token|refresh_token)=([^&\\s]+)", "$1=[REDACTED]"),
        ("(?i)(challengeId|email|identifier)=([^&\\s]+)", "$1=[REDACTED]"),
        (
          "(?i)\"(token|authfnToken|authfnWidgetToken|refreshToken|surrealToken|password|otp|code|challengeId|email|identifier)\"\\s*:\\s*\"[^\"]+\"",
          "\"$1\":\"[REDACTED]\""
        ),
        ("(?i)[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", "[REDACTED]"),
      ]
      for (pattern, replacement) in patterns {
        result = result.replacingOccurrences(
          of: pattern,
          with: replacement,
          options: .regularExpression
        )
      }
	    if result.count > 12_000 {
	      return String(result.prefix(12_000)) + "...<truncated>"
	    }
	    return result
	  }
	}
