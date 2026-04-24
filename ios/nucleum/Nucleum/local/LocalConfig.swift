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
  static let appDataUrl = URL(string: "")
  static let urlScheme = "nucleum"

  //Production
  // static let appUrl = "https://web.nucleum.app"
  // static let apiUrl = "https://api.nucleum.app"

  //Dev devices
  static let appUrl = "https://dev.nucleum.app"
  static let apiUrl = "https://api.21n.dev"

  //Local testing
  // static let appUrl = "http://localhost:4173"
  // static let apiUrl = "https://api.tidigit.dev"

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
