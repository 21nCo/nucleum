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
    Log.log(
      logType: .error, message: message ?? error?.localizedDescription ?? "", context: context)
  }
  fileprivate static func log(logType: logType, message: String, context: LogContext? = nil) {
    var log = logType.desc + " " + message
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
      Utils.performSurrealCall(
        "insert into debugLog {message: $message, timestamp: $timestamp, src: $src, type: $type, app: $app, os: $os, osVersion: $osVersion, device: $device}",
        [
          "message": message, "timestamp": "\(TimeUtils.getCurrentTimeInUTC())",
          "type": logType.shortDesc, "src": "embed", "context": context?.desc ?? "",
          "app": LocalConfig.defaultAppName,
          "osVersion":
            "\(osVersion.majorVersion).\(osVersion.minorVersion).\(osVersion.patchVersion)",
          "os": os, "device": device,
        ]
      ) {
        (response, err) in
        if let response = response {
          // print("response saving log to surreal: \(response)")
          let context = LogContext(
            file: #file, function: #function, line: #line, isSaveToServer: false)
          Log.info("response saving log to surreal: \(response)", context: context)
        }
        if let err = err {
          // print("error saving log to surreal: \(err)")
          let context = LogContext(
            file: #file, function: #function, line: #line, isSaveToServer: false)
          Log.error(error: err, context: context)
        }
      }
    }
    #endif
  }
}
