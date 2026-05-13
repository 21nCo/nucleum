//
//  PointronConfig.swift
//  Pointron
//
//  Created by Ar on 10/26/23.
//

import Foundation

struct LocalConfig {
  static let defaultAppName = "Pointron"
  static let appGroup = "group.io.pointron"
  static let surrealUrl = ""
  static let urlScheme = "pointron"

  static var environment: String { infoString("NucleusAppEnvironment", fallback: "dev") }
  static var defaultRegion: String { infoString("NucleusDefaultRegion", fallback: "insouth") }
  static var product: String { infoString("NucleusProduct", fallback: "pointron.app") }
  static var accountDomain: String { infoString("NucleusAccountDomain", fallback: "nucleum.app") }
  static var debugSinkUrl: String {
    infoString("NucleusDebugSinkUrl", fallback: "https://nucleus-debug-sink.21n.workers.dev")
  }

  static var webOrigin: String {
    switch environment {
    case "local":
      return "https://local.\(product)"
    case "pre":
      return "https://pre.\(product)"
    case "live":
      return "https://web.\(product)"
    default:
      return "https://dev.\(product)"
    }
  }

  static var accountUrl: String {
    accountUrl(for: defaultRegion)
  }

  static func accountUrl(for region: String?) -> String {
    let resolvedRegion = region?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    let regionId = resolvedRegion?.isEmpty == false ? resolvedRegion! : defaultRegion
    let environmentSuffix = environment == "live" ? "" : "-\(environment)"
    return "https://account-\(regionId)\(environmentSuffix).\(accountDomain)"
  }

  static var widgetApiUrl: String { "\(accountUrl)/widget" }
  static var appDataUrl: URL? { URL(string: "\(webOrigin)/app-data") }

  private static func infoString(_ key: String, fallback: String) -> String {
    guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String else {
      return fallback
    }
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? fallback : trimmed
  }
  init() {
    if let surrealUrl = ProcessInfo.processInfo.environment["surrealUrl"] {
      print("surrealUrl: \(surrealUrl)")
      // LocalConfig.surrealUrl = URL(string: surrealUrl)
    }
  }

  static let currentSessionWidget: WidgetConfig = WidgetConfig(
    kind: "CurrentSessionWidgetKind", name: "Current Focus",
    description: "Shows currently focusing task along with duration")
  static let targetsWidgets: WidgetConfig = WidgetConfig(
    kind: "TargetsWidget", name: "Targets",
    description: "Shows your daily, weekly, monthly focus targets")
}

struct WidgetConfig {
  var kind: String
  var name: String
  var description: String
}
