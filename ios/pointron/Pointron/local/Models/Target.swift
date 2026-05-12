//
//  Target.swift
//  PointronWidgetExtensionExtension
//
//  Created by Ar on 11/19/23.
//

import Foundation


struct Targets: Decodable {
    var isSessionRunning: Bool;
    var goalName: String?;
    var color: String?;
    var start: Date?;
    var end: Date?;
    var todayFocus: Float?;
    var isLoggedIn: Bool?;
    var isFocusing: Bool;
    static let defaultEntry = CurrentSessionEntry(date: Date(), session: CurrentSession(isSessionRunning: false, isFocusing: false),colors: resolveColors());
    
    static func resolveColors() -> ColorSchemeColors {
        let sharedDefaults = UserDefaults(suiteName: LocalConfig.appGroup);
        var colors: ColorSchemeColors = defaultScheme.colors;
        if let schemeString = sharedDefaults?.string(forKey: "scheme") {
            let jsonData = Data(schemeString.utf8)
            let decoder = JSONDecoder()
            do {
                let scheme = try decoder.decode(ColorScheme.self, from: jsonData)
                colors = scheme.colors;
            } catch {
//                logs.append("error in decoding scheme: \(error.localizedDescription), schemeString: \(schemeString)");
            }
        }
        return colors;
    }
    
    static func refreshSessionInformation(completion:@escaping (CurrentSession?, Error?) -> Void) {
        let sharedDefaults = UserDefaults(suiteName: LocalConfig.appGroup);
        var logs: [String] = [];
        do {
            var userId: String? = nil;
            if let user = sharedDefaults?.string(forKey: "userId") {
                userId = user;
            } else{
                logs.append("userId not found. User not logged in")
            }
            let dateFormatter = DateFormatter()
            dateFormatter.locale = Locale(identifier: "en_US_POSIX")
            dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
            dateFormatter.timeZone = TimeZone(secondsFromGMT: 0)
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .formatted(dateFormatter)
            let elapsed = resolveBackgroundElapsed();
            logs.append("background elapsed: \(elapsed)")
            if(elapsed > 5 * 60){
                if let sessionDataString = sharedDefaults?.string(forKey: "sessionData") {
                    let jsonData = Data(sessionDataString.utf8)
                    do {
                        var sessionData = try decoder.decode(CurrentSession.self, from: jsonData)
                        sessionData.todayFocus = (sessionData.todayFocus ?? 0) / (60 * 60)
                        completion(sessionData, nil);
                        saveLogs(logs)
                        return;
                    } catch {
                        logs.append("error in decoding sessiondata: \(error.localizedDescription), sessionDataString: \(sessionDataString)")
                    }
                }
            }
            var request = URLRequest(url: URL(string: "\(LocalConfig.widgetApiUrl)/v2/embed/widget/focus")!);
            request.httpMethod = "POST";
            var widgetToken: String? = nil;
            if let token = sharedDefaults?.string(forKey: "authfnWidgetToken") {
                widgetToken = token;
            }
            if(widgetToken == nil || userId == nil){
                logs.append("widget token and userId not found")
                completion(nil, nil);
                saveLogs(logs);
                return;
            }
            request.addValue("Bearer \(widgetToken!)", forHTTPHeaderField: "Authorization")
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
                    logs.append("error in data task: \(error)");
                    saveLogs(logs);
                    completion(nil, error);
                    return;
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
                            let response = try decoder.decode([SurrealResult].self, from: unwrappedData)
                            if let currentSessions = response[1].result {
                                logs.append("parsed currentsessions: \(currentSessions.count)");
                                saveLogs(logs);
                                completion(currentSessions[0], nil);
                                return;
                            }
                        } catch {
                            logs.append("parse error in Json: \(error)");
                            saveLogs(logs);
                            completion(nil, error);
                            return;
                        }
                    } else {
                        logs.append("Unable to unwrap data: \(error)");
                        saveLogs(logs)
                        completion(nil, error);
                        return;
                    }
                }
            }
            task.resume()
        }
        catch {
            completion(nil, error)
        }
    }
}
