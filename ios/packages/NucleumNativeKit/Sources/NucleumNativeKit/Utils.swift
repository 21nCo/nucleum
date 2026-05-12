//
//  Utils.swift
//
//
//  Created by Ar on 10/26/23.
//

import Foundation
import Security

struct Utils {
  func hasKey(object: Any, key: String) -> Bool {
    let mirror = Mirror(reflecting: object)

    for child in mirror.children {
      if child.label == key {
        return true
      }
    }
    return false
  }

  static func resolveBackgroundElapsed() -> Int {
    let sharedDefaults = UserDefaults(suiteName: LocalConfig.appGroup)
    var elapsed = 0
    let backgrounded = sharedDefaults?.double(forKey: "backgrounded")
    if let backgrounded {
      if backgrounded == 0 {
        elapsed = 0
      } else {
        elapsed = Int(Date().timeIntervalSince1970 - backgrounded)
      }
    }
    return elapsed
  }

  static func parseJWT(token: String) -> [String: Any]? {
    let parts = token.components(separatedBy: ".")
    guard parts.count > 1 else { return nil }

    var base64 = parts[1]
    if base64.count % 4 != 0 {
      let padlen = 4 - base64.count % 4
      base64 += String(repeating: "=", count: padlen)
    }

    guard let data = Data(base64Encoded: base64) else { return nil }
    let json = try? JSONSerialization.jsonObject(with: data, options: [])
    return json as? [String: Any]
  }

  func saveLogToServer(logMessage: String) {
    // Define the server endpoint
    guard let url = URL(string: "https://your-server.com/api/logs") else {
      print("Invalid URL")
      return
    }

    // Create the URLSession object
    let session = URLSession.shared

    // Prepare the request
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    // Prepare the log message
    let logData: [String: Any] = ["message": logMessage]
    request.httpBody = try? JSONSerialization.data(withJSONObject: logData)

    // Send the request
    let task = session.dataTask(with: request) { (data, response, error) in
      if let error = error {
        print("Error: \(error)")
      } else if let data = data {
        let str = String(data: data, encoding: .utf8)
        print("Received data:\n\(str ?? "")")
      }
    }

    task.resume()
  }

  static func performSurrealCall(
    _ rawQuery: String, _ params: [String: String]? = nil,
    completion: @escaping (String?, Error?) -> Void
  ) {
    var query = rawQuery
    if let params = params {
      for (key, value) in params {
        // let replacedValue = "\\$\(key)"
        query = query.replacingOccurrences(
          of: "$\(key)", with: "'\(value)'")
      }
    }
    var userId: String? = nil
    guard let sharedDefaults = UserDefaults(suiteName: LocalConfig.appGroup) else {
      let context = LogContext(file: #file, function: #function, line: #line, isSaveToServer: false)
      Log.error(message: "Unable to get sharedDefaults", context: context)
      return
    }
    if let user = sharedDefaults.string(forKey: "userId") {
      userId = user
    } else {
      let context = LogContext(file: #file, function: #function, line: #line, isSaveToServer: false)
      Log.error(message: "userId not found.", context: context)
    }
    let authFnToken = AuthFnCredentialStore.readSessionToken()
    if authFnToken == nil {
      let context = LogContext(file: #file, function: #function, line: #line, isSaveToServer: false)
      Log.error(message: "authfnToken not found.", context: context)
    }
    if authFnToken == nil || userId == nil {
      completion(
        nil,
        NSError(
          domain: LocalConfig.appGroup, code: 401,
          userInfo: [NSLocalizedDescriptionKey: "User not logged in"]))
      return
    }
    var request = URLRequest(url: URL(string: "\(LocalConfig.widgetApiUrl)/account/n/run")!)
    request.httpMethod = "POST"
    request.addValue("Bearer \(authFnToken!)", forHTTPHeaderField: "Authorization")
    // request.httpBody =
    //   "USE database \(userId!);  \(query);".data(
    //     using: .utf8)
    // request.addValue("text/plain", forHTTPHeaderField: "Content-Type")
    let fullQuery = "USE database \(userId!);  \(query);"
    let requestBody: [String: Any] = ["db": userId!, "query": fullQuery]
    let jsonData = try? JSONSerialization.data(withJSONObject: requestBody)

    request.httpBody = jsonData
    request.addValue("application/json", forHTTPHeaderField: "Content-Type")

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
        let context = LogContext(
          file: #file, function: #function, line: #line, isSaveToServer: false)
        Log.error(error: error, context: context)
      } else {
        if let httpResponse = response as? HTTPURLResponse {
          let context = LogContext(
            file: #file, function: #function, line: #line, isSaveToServer: false)
          Log.info("Status Code: \(httpResponse.statusCode)", context: context)
        }
        if data != nil {
          let context = LogContext(
            file: #file, function: #function, line: #line, isSaveToServer: false)
          Log.info("Response received", context: context)
        }
        if let unwrappedData = data {
          do {}
        }
      }
    }
    task.resume()
  }

  static func performApiCall(
    endpoint: String,
    request: [String: Any],
    method: String = "POST",
    completion: @escaping (Data?, Error?) -> Void
  ) {
    Log.info("Performing API call to \(endpoint)")
    guard let sharedDefaults = UserDefaults(suiteName: LocalConfig.appGroup) else {
      let context = LogContext(file: #file, function: #function, line: #line, isSaveToServer: false)
      Log.error(message: "Unable to get sharedDefaults", context: context)
      return
    }

    let authFnToken = AuthFnCredentialStore.readSessionToken()
    if authFnToken == nil {
      let context = LogContext(file: #file, function: #function, line: #line, isSaveToServer: false)
      Log.error(message: "authfnToken not found.", context: context)
    }

    if authFnToken == nil {
      completion(
        nil,
        NSError(
          domain: LocalConfig.appGroup, code: 401,
          userInfo: [NSLocalizedDescriptionKey: "User not logged in"]))
      return
    }

    guard let url = URL(string: "\(LocalConfig.widgetApiUrl)\(endpoint)") else {
      let context = LogContext(file: #file, function: #function, line: #line, isSaveToServer: false)
      Log.error(message: "Invalid URL", context: context)
      return
    }

    var urlRequest = URLRequest(url: url)
    urlRequest.httpMethod = method
    urlRequest.addValue("Bearer \(authFnToken!)", forHTTPHeaderField: "Authorization")
    urlRequest.addValue("application/json", forHTTPHeaderField: "Content-Type")
    urlRequest.addValue("application/json", forHTTPHeaderField: "Accept")

    do {
      urlRequest.httpBody = try JSONSerialization.data(withJSONObject: request)
    } catch {
      let context = LogContext(file: #file, function: #function, line: #line, isSaveToServer: false)
      Log.error(error: error, context: context)
      completion(nil, error)
      return
    }

    let task = URLSession.shared.dataTask(with: urlRequest) { (data, response, error) in
      if let error = error {
        let context = LogContext(
          file: #file, function: #function, line: #line, isSaveToServer: false)
        Log.error(error: error, context: context)
        completion(nil, error)
        return
      }

      if let httpResponse = response as? HTTPURLResponse {
        let context = LogContext(
          file: #file, function: #function, line: #line, isSaveToServer: false)
        Log.info("Status Code: \(httpResponse.statusCode)", context: context)
      }

      if data != nil {
        let context = LogContext(
          file: #file, function: #function, line: #line, isSaveToServer: false)
        Log.info("Response received", context: context)
      }

      completion(data, nil)
    }
    task.resume()
  }
}

enum AuthFnCredentialStore {
  private static let service = "\(LocalConfig.appGroup).authfn"
  private static let sessionTokenAccount = "session-token"

  static func storeSessionToken(_ token: String) {
    guard let data = token.data(using: .utf8) else { return }
    deleteSessionToken()

    var query = baseQuery()
    query[kSecValueData as String] = data

    let status = SecItemAdd(query as CFDictionary, nil)
    if status != errSecSuccess {
      Log.error(message: "Unable to store AuthFn session token in Keychain: \(status)")
    }
  }

  static func readSessionToken() -> String? {
    var query = baseQuery()
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne

    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    guard status == errSecSuccess, let data = result as? Data else {
      return migrateLegacySharedDefaultsToken()
    }
    return String(data: data, encoding: .utf8)
  }

  static func deleteSessionToken() {
    let status = SecItemDelete(baseQuery() as CFDictionary)
    if status != errSecSuccess && status != errSecItemNotFound {
      Log.error(message: "Unable to delete AuthFn session token from Keychain: \(status)")
    }
  }

  private static func baseQuery() -> [String: Any] {
    return [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: sessionTokenAccount,
    ]
  }

  private static func migrateLegacySharedDefaultsToken() -> String? {
    guard
      let sharedDefaults = UserDefaults(suiteName: LocalConfig.appGroup),
      let token = sharedDefaults.string(forKey: "authfnToken"),
      !token.isEmpty
    else {
      return nil
    }
    storeSessionToken(token)
    sharedDefaults.removeObject(forKey: "authfnToken")
    return token
  }
}

struct TimeUtils {
  static func getCurrentTimeInUTC() -> String {
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
    dateFormatter.timeZone = TimeZone(abbreviation: "UTC")
    return dateFormatter.string(from: Date())
  }
}
