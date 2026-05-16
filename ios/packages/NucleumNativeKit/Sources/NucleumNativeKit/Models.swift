//
//  Models.swift
//  Pointron
//
//  Created by Ar on 10/12/23.
//

import Foundation

struct AppData: Decodable {
  var colorschemes: [ColorScheme]
  var name: String
  var version: String?
}

struct ColorScheme: Decodable {
  var id: String
  var isDark: Bool
  var label: String
  var theme: String
  var colors: ColorSchemeColors
}

struct ColorSchemeColors: Decodable {
  var bgs1: String
  var bgs2: String
  var bgs3: String
  var bgs4: String?
  var fgs1: String
  var fgs2: String
  var fgs3: String
  var fgs4: String?
  var brs1: String
  var brs2: String
  var brs3: String?
  var aps1: String
  var aps2: String?
  var aps3: String?
  var ass1: String
  var ass2: String?
  var ass3: String?
  init(bgs1Default: String, fgs1Default: String) {
    bgs1 = bgs1Default
    bgs2 = ""
    bgs3 = ""
    bgs4 = ""
    fgs1 = fgs1Default
    fgs2 = ""
    fgs3 = ""
    fgs4 = ""
    brs1 = ""
    brs2 = ""
    brs3 = ""
    aps1 = ""
    aps2 = ""
    aps3 = ""
    ass1 = ""
    ass2 = ""
    ass3 = ""
  }
}

struct Popup: Decodable {
  var path: String
  var isShow: Bool
  var title: String?
  var params: [String: String]?
}

struct FetchRequest: Decodable {
  var url: String
  var id: String
}

struct DataRequest: Decodable {
  var id: String
  var type: String
  var body: [String: AnyCodable]
}

struct AnyCodable: Codable {
  let value: Any

  init(_ value: Any) {
    self.value = value
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()

    if container.decodeNil() {
      self.value = NSNull()
    } else if let bool = try? container.decode(Bool.self) {
      self.value = bool
    } else if let int = try? container.decode(Int.self) {
      self.value = int
    } else if let double = try? container.decode(Double.self) {
      self.value = double
    } else if let string = try? container.decode(String.self) {
      self.value = string
    } else if let array = try? container.decode([AnyCodable].self) {
      self.value = array.map { $0.value }
    } else if let dictionary = try? container.decode([String: AnyCodable].self) {
      self.value = dictionary.mapValues { $0.value }
    } else {
      throw DecodingError.dataCorruptedError(
        in: container, debugDescription: "AnyCodable cannot decode value")
    }
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.singleValueContainer()

    switch self.value {
    case is NSNull:
      try container.encodeNil()
    case let bool as Bool:
      try container.encode(bool)
    case let int as Int:
      try container.encode(int)
    case let double as Double:
      try container.encode(double)
    case let string as String:
      try container.encode(string)
    case let array as [Any]:
      try container.encode(array.map { AnyCodable($0) })
    case let dictionary as [String: Any]:
      try container.encode(dictionary.mapValues { AnyCodable($0) })
    default:
      throw EncodingError.invalidValue(
        self.value,
        EncodingError.Context(
          codingPath: container.codingPath, debugDescription: "AnyCodable cannot encode value"))
    }
  }
}

struct DownloadRequest: Decodable {
  var url: String?
  var data: String?
  var contentType: String?
  var filename: String?
}

struct Account: Decodable {
  var isLoggedIn: Bool
  var token: String?
  var widgetToken: String?
  var userId: String?
  var regionId: String?
  var accountUrl: String?
}

struct InAppNotification: Decodable {
  var message: String
  var sound: String?
}

enum ColorType {
  case fg
  case bg
  case accent
}

struct AppNotification: Decodable {
  var id: String
  var title: String?
  var message: String
  var timestamp: TimeInterval
  var sound: String?
}

struct IncomingMessage {
  static let PING = "PING"
  static let MOUNT = "MOUNT"
  static let CAMERA = "CAMERA"
  static let SHEET_MOUNTED = "SHEET_MOUNTED"
  static let CLEAR_NOTIFICATIONS = "CLEAR_NOTIFICATIONS"
  static let MENU_ITEM_SELECTED = "MENU_ITEM_SELECTED"
  static let RESTORE_PURCHASE = "RESTORE_PURCHASE"
  static let CHECK_SUBSCRIPTION = "CHECK_SUBSCRIPTION"
  static let MODIFY_SUBSCRIPTION = "MODIFY_SUBSCRIPTION"
  static let LOCATION = "LOCATION"
  static let TRANSCRIBE_AUDIO = "TRANSCRIBE_AUDIO"
  static let RETRIEVE_JOB = "RETRIEVE_JOB"
  static let DOWNLOAD_MODEL = "DOWNLOAD_MODEL"
  static let RELOAD = "RELOAD"
}

struct FontSize {
  static let sheetHeading: CGFloat = 22
}
