//
//  LocalConfig.swift
//  Memotron
//
//  Created by Ar on 2/8/24.
//

import Foundation

struct LocalConfig {
  static let defaultAppName = "Memotron"
  static let appGroup = "group.io.memotron"
  static let appDataUrl = URL(string: "")
  static let urlScheme = "memotron"

  //Production
  // static let appUrl = "https://web.memotron.app"
  // static let apiUrl = "https://api.memotron.app"

  //Dev devices
  static let appUrl = "https://dev.memotron.app"
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
