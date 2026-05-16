//
//  CurrentSession.swift
//  Pointron
//
//  Created by Ar on 10/26/23.
//

import Foundation
import SwiftUI
import WidgetKit

func saveLogs(_ logs: [String]) {
  let sharedDefaults = UserDefaults(suiteName: LocalConfig.appGroup)
  let dateFormatter = DateFormatter()
  dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
  let timestamp = dateFormatter.string(from: Date())

  var updatedLogs = logs
  updatedLogs.append("Saving logs at \(timestamp)")
  if let encodedLogs = try? JSONEncoder().encode(updatedLogs) {
    sharedDefaults?.set(encodedLogs, forKey: "widgetLogs")
  }
}

func resolveColors() -> ColorSchemeColors {
  let sharedDefaults = UserDefaults(suiteName: LocalConfig.appGroup)
  var colors: ColorSchemeColors = defaultScheme.colors
  if let schemeString = sharedDefaults?.string(forKey: "scheme") {
    let jsonData = Data(schemeString.utf8)
    let decoder = JSONDecoder()
    do {
      let scheme = try decoder.decode(ColorScheme.self, from: jsonData)
      colors = scheme.colors
    } catch {
      //                logs.append("error in decoding scheme: \(error.localizedDescription), schemeString: \(schemeString)");
    }
  }
  return colors
}

func resolveDefaultColor(_ type: ColorType = .accent) -> Color {
  let colors = resolveColors()
  switch type {
  case .accent:
    return Color.hsl(colors.aps1)
  case .bg:
    return Color.hsl(colors.bgs1)
  case .fg:
    return Color.hsl(colors.fgs1)
  }
}

func resolveSupportedFamilies() -> [WidgetFamily] {
  if #available(iOS 16.0, *) {
    #if os(watchOS)
      return [
        .accessoryCircular,
        .accessoryRectangular, .accessoryInline,
      ]
    #else
      return [
        .accessoryCircular,
        .accessoryRectangular, .accessoryInline,
        .systemSmall, .systemMedium,
      ]
    #endif
  } else {
    return [.systemSmall, .systemMedium]
  }
}

func decoder() -> JSONDecoder {
  let dateFormatter = DateFormatter()
  dateFormatter.locale = Locale(identifier: "en_US_POSIX")
  dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
  dateFormatter.timeZone = TimeZone(secondsFromGMT: 0)
  let decoder = JSONDecoder()
  decoder.dateDecodingStrategy = .formatted(dateFormatter)
  return decoder
}

func resolveWidgetDataFromUserDefaults() -> CurrentSession? {
  let sharedDefaults = UserDefaults(suiteName: LocalConfig.appGroup)
  if let sessionDataString = sharedDefaults?.string(forKey: "sessionData") {
    let jsonData = Data(sessionDataString.utf8)
    do {
      var sessionData = try decoder().decode(CurrentSession.self, from: jsonData)
      sessionData.todayFocus = (sessionData.todayFocus ?? 0) / (60 * 60)
      return sessionData
    } catch {
      return nil
    }
  } else {
    return nil
  }
}

struct CurrentSession: Decodable {
  var isSessionRunning: Bool
  var goalName: String?
  var color: String?
  var start: Date?
  var end: Date?
  var todayFocus: Float?
  var isLoggedIn: Bool?
  var isFocusing: Bool
  static let defaultEntry = CurrentSessionEntry(
    date: Date(), session: CurrentSession(isSessionRunning: false, isFocusing: false),
    colors: resolveColors())

  static func refreshSessionInformation(completion: @escaping (CurrentSession?, Error?) -> Void) {
    let sharedDefaults = UserDefaults(suiteName: LocalConfig.appGroup)
    var logs: [String] = []
    logs.append("refreshSessionInformation - app group \(LocalConfig.appGroup)")
    logs.append("sharedDefaults available: \(sharedDefaults != nil)")
    do {
      var userId: String? = nil
      var userRegion: String? = nil
      if let user = sharedDefaults?.string(forKey: "userId") {
        userId = user
      } else {
        logs.append("userId not found. User not logged in")
      }
      var widgetToken: String? = nil
      if let token = sharedDefaults?.string(forKey: "authfnWidgetToken") {
        widgetToken = token
        userRegion = sharedDefaults?.string(forKey: "userRegion")
      } else {
        logs.append("authfnWidgetToken not found. User not logged in")
      }
      let elapsed = Utils.resolveBackgroundElapsed()
      logs.append("background elapsed: \(elapsed)")
      if widgetToken == nil || userId == nil || userRegion == nil {
        let sessionData = resolveWidgetDataFromUserDefaults()
        completion(sessionData, nil)
        saveLogs(logs)
        return
      }

      guard let url = URL(string: "\(LocalConfig.widgetApiUrl)/v2/embed/widget/focus") else {
        let context = LogContext(
          file: #file, function: #function, line: #line, isSaveToServer: false)
        Log.error(message: "Invalid URL", context: context)
        return
      }

      var request = URLRequest(url: url)
      request.httpMethod = "POST"
      if widgetToken == nil || userId == nil {
        logs.append("widget token and userId not found")
        completion(nil, nil)
        saveLogs(logs)
        return
      }
      request.addValue("Bearer \(widgetToken!)", forHTTPHeaderField: "Authorization")
      request.addValue("application/json", forHTTPHeaderField: "Accept")
      //        if let headers = request.allHTTPHeaderFields {
      //            for (headerField, value) in headers {
      //                print("\(headerField): \(value)")
      //            }
      //        } else {
      //            print("No headers set for this request.")
      //        }
      let task = URLSession.shared.dataTask(with: request) { (data, response, error) in
        if error != nil {
          logs.append("error in data task: \(error)")
          saveLogs(logs)
        } else {
          if let httpResponse = response as? HTTPURLResponse {
            logs.append("Status Code: \(httpResponse.statusCode)")
          }
          if data != nil {
            logs.append("Response received")
          }
          if let unwrappedData = data {
            do {
              sharedDefaults?.set(logs, forKey: "widgetLogs")
              let response = try decoder().decode(
                [CurrentSessionSurrealResult].self, from: unwrappedData)
              if response.indices.contains(1), let currentSession = response[1].result {
                // logs.append("parsed currentsessions: \(currentSessions.count)")
                saveLogs(logs)
                completion(currentSession, nil)
                return
              }
            } catch {
              logs.append("parse error in Json: \(error)")
              saveLogs(logs)
            }
          } else {
            logs.append("Unable to unwrap data: \(error)")
            saveLogs(logs)
          }
        }
        let sessionData = resolveWidgetDataFromUserDefaults()
        completion(sessionData, nil)
        saveLogs(logs)
        return
      }
      task.resume()
    } catch {
      completion(nil, error)
    }
  }
}
