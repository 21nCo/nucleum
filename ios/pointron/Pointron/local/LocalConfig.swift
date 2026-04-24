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
  static let appDataUrl = URL(string: "")
  static let surrealUrl = ""
  static let urlScheme = "pointron"

  //Live
  static let appUrl = "https://web.pointron.app"
  static let apiUrl = "https://api.pointron.app"

  //Dev devices
  // static let appUrl = "https://dev.pointron.app"
  // static let apiUrl = "https://api.tidigit.dev"

  //Local testing
  // static let appUrl = "http://localhost:4173"
  // static let apiUrl = "https://api.tidigit.dev"
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
