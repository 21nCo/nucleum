//
//  LocalConfig.swift
//  Nucleum
//
//  Created by Ar on 2/8/24.
//

import Foundation

struct LocalConfig {
  static let defaultAppName = "Nucleum"
  static let appGroup = "group.io.nucleum"
  static let urlScheme = "nucleum"

  static var environment: String { infoString("NucleusAppEnvironment", fallback: "dev") }
  static var defaultRegion: String { infoString("NucleusDefaultRegion", fallback: "insouth") }
  static var product: String { infoString("NucleusProduct", fallback: "nucleum.app") }
  static var accountDomain: String { infoString("NucleusAccountDomain", fallback: "nucleum.app") }
  static var debugSinkUrl: String {
    infoString("NucleusDebugSinkUrl", fallback: "https://nucleus-debug-sink.21n.workers.dev")
  }
  static var normalizedEnvironment: String {
    switch environment.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() {
    case "local", "pre", "live":
      return environment.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    default:
      return "dev"
    }
  }

  static var webOrigin: String {
    switch normalizedEnvironment {
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
    let environmentSuffix = normalizedEnvironment == "live" ? "" : "-\(normalizedEnvironment)"
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

  static let currentSessionWidget: WidgetConfig = WidgetConfig(
    kind: "CurrentSessionWidget", name: "Current Focus",
    description: "Shows currently focusing task and duration")
  static let targetsWidgets: WidgetConfig = WidgetConfig(
    kind: "TargetsWidget", name: "Targets",
    description: "Shows your daily, weekly, monthly focus targets")
}

struct WidgetConfig {
  var kind: String
  var name: String
  var description: String
}
