//
//  AppStore.swift
//  Pointron
//
//  Created by Ar on 10/18/23.
//

import AVFoundation
import AuthFnClient
import CoreData
import CoreLocation
import Foundation
import SwiftUI
import WidgetKit

#if os(iOS)
  import UIKit
#elseif os(macOS)
  import AppKit
#endif

//cs_tidigit_light
//let defaultScheme = ColorScheme(id: "default", isDark: false, label: "pointron", theme: "clean",
//                                colors: ColorSchemeColors(bgs1: "hsl(0 0% 100%)", bgs2: "hsl(0 0% 98%)", bgs3: "hsl(0 0% 92%)", bgs4: "hsl(0 0% 88%)", fgs1: "hsl(0 0% 20%)", fgs2: "hsl(0 0% 33%)", fgs3: "hsl(0 0% 50%)", a1: "hsl(354 72% 64%)", a2: "hsl(0 28% 55%)"))

class AppStore: NSObject, ObservableObject, CLLocationManagerDelegate, JobManagerDelegate {
  static let shared = AppStore()

  @Published var text: String = "Initial Value"
  @Published var appUrl: String = ""
  @Published var popup: Popup = Popup(path: "", isShow: false, title: "", params: [:])
  @Published var modalHeading: String = ""
  @Published var isShowLoadingOverlay: Bool = false
  @Published var colorScheme: ColorScheme = defaultScheme
  @Published var bg: Color = Color.hsl(defaultScheme.colors.bgs1)
  @Published var bgIndex: Int = 0
  @Published var fg: Color = Color.hsl(defaultScheme.colors.fgs1)
  @Published var isShowModalOverlay: Bool = false
  @Published var isShowSheet: Bool = false
  @Published var isAppMounted: Bool = false
  @Published var isSheetMounted: Bool = false
  @Published var isShowCamera: Bool = false
  @Published var inAppSafariUrl: String = ""
  @Published var oauthUrl: String = ""
  @Published var appData: AppData = AppData(colorschemes: [], name: LocalConfig.defaultAppName)
  let sharedDefaults = UserDefaults(suiteName: LocalConfig.appGroup)
  private let widgetTokenRefreshLeewaySeconds: TimeInterval = 5 * 60
  private let authFnClient = AuthFnClient(
    configuration: AuthFnConfiguration(
      defaultRegionId: LocalConfig.defaultRegion,
      resolveBaseURL: { regionId in
        URL(string: LocalConfig.accountUrl(for: regionId)) ?? URL(string: LocalConfig.accountUrl)!
      }
    )
  )
  #if os(iOS)
    private let nativeAppleSignInCoordinator = AuthFnNativeAppleSignInCoordinator()
    private var pendingDownloadRequestIds: [ObjectIdentifier: String] = [:]
    private var pendingDownloadCleanupUrls: [ObjectIdentifier: URL] = [:]
  #endif

  // Model download progress tracking
  @Published var modelDownloadProgress: [String: Double] = [:]
  private var modelDownloadStatuses: [String: Bool] = [:] {
    didSet {
      // Persist model download statuses to shared defaults
      sharedDefaults?.set(modelDownloadStatuses, forKey: "modelDownloadStatuses")
    }
  }

  // Supported models for each type
  private let supportedModels: [String: [String]] = [
    "transcription": ["tiny", "base", "small", "medium"],
    "summarization": [],
  ]

  // Location manager and pending location request properties
  private var locationManager: CLLocationManager?
  private var pendingLocationRequest: DataRequest?
  private var locationRequestTimer: Timer?

  // Job management
  private let jobManager = JobManager.shared
  private var aiServiceProvider: AIServiceProvider?

  override init() {
    super.init()
    setupJobManager()
    loadPersistedModelStatuses()
  }

  private func setupJobManager() {
    jobManager.delegate = self
  }

  private func loadPersistedModelStatuses() {
    if let savedStatuses = sharedDefaults?.object(forKey: "modelDownloadStatuses")
      as? [String: Bool]
    {
      modelDownloadStatuses = savedStatuses
    }
  }

  func setAIServiceProvider(_ provider: AIServiceProvider) {
    self.aiServiceProvider = provider
    jobManager.setAIServiceProvider(provider)
  }

  func printWidgetLogs() {
    if let widgetLogs = sharedDefaults?.data(forKey: "widgetLogs") {
      if let logs = try? JSONDecoder().decode([String].self, from: widgetLogs) {
        Log.info("Widget logs: \(logs)")
      }
    } else {
      Log.info("no widget logs")
    }
  }

  func restorePurchase() {
    Log.info("Restoring purchase")

    let storeManager = StoreManager.shared
    storeManager.restorePurchases { success, error, subscriptionInfo in
      DispatchQueue.main.async {
        if success {
          Log.info("Successfully restored purchases")

          // Convert and send subscription data
          let subscriptionData = self.convertSubscriptionInfoToDict(subscriptionInfo)

          // First send to API
          self.sendPaymentMessageToApi(message: [
            "type": "RESTORE_PURCHASE_SUCCESS",
            "embedTransaction": subscriptionData,
          ]) { data, error in
            // After API call completes, send to app
            DispatchQueue.main.async {
              self.sendMessageToApp(message: [
                "type": "RESTORE_PURCHASE_SUCCESS",
                "embedTransaction": subscriptionData,
              ])
            }
          }
        } else {
          Log.error(
            message:
              "Failed to restore purchases: \(error?.localizedDescription ?? "Unknown error")")
          // Notify the app about the failure
          self.sendMessageToApp(message: [
            "type": "RESTORE_PURCHASE_ERROR",
            "error": error?.localizedDescription ?? "Unknown error",
          ])
        }
      }
    }
  }

  // Method to check current subscription status without requiring a restore
  func checkSubscriptionStatus() {
    Log.info("Checking subscription status")

    let storeManager = StoreManager.shared
    storeManager.checkSubscriptionStatus { subscriptionInfo, error in
      DispatchQueue.main.async {
        if let error = error {
          Log.error(message: "Failed to check subscription status: \(error.localizedDescription)")
          self.sendMessageToApp(message: [
            "type": "SUBSCRIPTION_STATUS_ERROR",
            "error": error.localizedDescription,
          ])
          return
        }

        // Convert and send subscription data
        let subscriptionData = self.convertSubscriptionInfoToDict(
          subscriptionInfo, includeActiveStatus: true)

        // Notify the app about subscription status
        self.sendMessageToApp(message: [
          "type": "SUBSCRIPTION_STATUS",
          "embedTransaction": subscriptionData,
        ])
      }
    }
  }

  // Helper method to convert SubscriptionInfo array to dictionary format for sending to app
  private func convertSubscriptionInfoToDict(
    _ subscriptionInfo: [SubscriptionInfo]?, includeActiveStatus: Bool = false
  ) -> [[String: Any]] {
    var subscriptionData: [[String: Any]] = []

    if let subscriptions = subscriptionInfo {
      for subscription in subscriptions {
        var subData: [String: Any] = [
          "productId": subscription.productId,
          "transactionId": subscription.transactionId,
        ]

        if let purchaseDate = subscription.purchaseDate {
          subData["purchaseDate"] = Int(purchaseDate.timeIntervalSince1970 * 1000)
        }

        if let expiryDate = subscription.expiryDate {
          subData["expiryDate"] = Int(expiryDate.timeIntervalSince1970 * 1000)

          // Include active status if requested
          if includeActiveStatus {
            let isActive = expiryDate > Date()
            subData["isActive"] = isActive
          }
        }

        if let originalTransactionId = subscription.originalTransactionId {
          subData["originalTransactionId"] = originalTransactionId
        }

        subData["isAutoRenewable"] = subscription.isAutoRenewable

        subscriptionData.append(subData)
      }
    }

    return subscriptionData
  }

  func performHapticFeedback(_ feedback: String) {
    if feedback == "default" || feedback == "menuitem" || feedback == "pressandhold" {
      #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: .soft)
        generator.impactOccurred()
      #endif
    } else if feedback == "save" || feedback == "delete" || feedback == "capture" {
      #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: .heavy)
        generator.impactOccurred()
      #endif
    } else if feedback == "success" {
      #if os(iOS)
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
      #endif
    }
    printWidgetLogs()
  }
  func fetchAppData() {
    guard let appDataUrl = LocalConfig.appDataUrl else {
      Log.error(message: "Invalid app data URL")
      return
    }
    var request = URLRequest(url: appDataUrl)
    request.httpMethod = "POST"
    let reqDict = ["app": LocalConfig.defaultAppName.lowercased()]
    do {
      let data = try JSONSerialization.data(withJSONObject: reqDict, options: .prettyPrinted)
      request.httpBody = data
    } catch let error {
      let context = LogContext(file: #file, function: #function, line: #line)
      Log.error(message: error.localizedDescription, context: context)
    }
    request.addValue("application/json", forHTTPHeaderField: "Content-Type")
    let task = URLSession.shared.dataTask(with: request) { (data, response, error) in
      if error != nil {
        Log.error(error: error)
      } else {
        if let unwrappedData = data {
          do {
            let result = try JSONDecoder().decode(AppData.self, from: unwrappedData)
            DispatchQueue.main.async {
              self.appData = result
            }
          } catch {
            let context = LogContext(file: #file, function: #function, line: #line)
            Log.error(message: "JSON parse error: \(error.localizedDescription)", context: context)
          }
        }
      }
    }
    task.resume()
  }
  func scheduleNotifications(_ notifications: [AppNotification]) {
    Log.info("scheduling notifications: \(notifications.map{$0.id})")
    for notification in notifications {
      #if os(iOS)
        let content = UNMutableNotificationContent()
        content.title = notification.title ?? "Pointron"
        content.subtitle = notification.message
        if let notificationSound = notification.sound {
          Log.info("Parsed sound")
          let sound = UNNotificationSound(
            named: UNNotificationSoundName(rawValue: notificationSound))
          content.sound = sound
        } else {
          content.sound = UNNotificationSound.default
        }
        let date = Date(timeIntervalSince1970: notification.timestamp / 1000)
        let triggerDate = Calendar.current.dateComponents(
          [.year, .month, .day, .hour, .minute, .second], from: date)
        let trigger = UNCalendarNotificationTrigger(dateMatching: triggerDate, repeats: false)
        let request = UNNotificationRequest(
          identifier: notification.id, content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request) { error in
          if let error = error {
            Log.error(message: "Error scheduling notification: \(error)")
          } else {
            Log.info("Scheduled notification with ID: \(notification.id) and \(date)")
          }
        }
      #endif
      #if os(macOS)
        let nsNotification = NSUserNotification()
        nsNotification.identifier = notification.id
        nsNotification.title = notification.title ?? "Pointron"
        nsNotification.informativeText = notification.message
        nsNotification.deliveryDate = Date(
          timeIntervalSince1970: Double(notification.timestamp) / 1000)

        if let notificationSound = notification.sound {
          Log.info("Parsed sound")
          nsNotification.soundName = notificationSound
        } else {
          nsNotification.soundName = NSUserNotificationDefaultSoundName
        }

        NSUserNotificationCenter.default.scheduleNotification(nsNotification)
        Log.info(
          "Scheduled notification with ID: \(nsNotification.identifier) for \(nsNotification.deliveryDate)"
        )
      #endif
    }
  }
  func clearAllScheduledNotifications() {
    Log.info("Clearing all scheduled notifications")
    #if os(iOS)
      UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    #elseif os(macOS)
      NSUserNotificationCenter.default.removeAllDeliveredNotifications()
      let center = NSUserNotificationCenter.default
      center.removeAllDeliveredNotifications()
      let scheduledNotifications = center.scheduledNotifications
      for notification in scheduledNotifications {
        center.removeScheduledNotification(notification)
      }
      Log.info("Cleared \(scheduledNotifications.count) scheduled notifications")
    #endif
  }
  func clearScheduledNotifications(notificationIds: [String]) {
    #if os(iOS)
      UNUserNotificationCenter.current().removePendingNotificationRequests(
        withIdentifiers: notificationIds)
    #elseif os(macOS)
      let center = NSUserNotificationCenter.default
      let scheduledNotifications = center.scheduledNotifications
      let notificationsToRemove = scheduledNotifications.filter { notification in
        notificationIds.contains(notification.identifier ?? "")
      }
      for notification in notificationsToRemove {
        center.removeScheduledNotification(notification)
      }
    #endif

  }

  func refreshAllWidgets() {
    WidgetCenter.shared.reloadAllTimelines()
    Log.info("Reload request sent to all widgets")
  }

  func refreshAuthFnWidgetTokenIfNeeded(force: Bool = false) {
    if !force,
      let expiresAt = readAuthFnWidgetTokenExpiresAt(),
      expiresAt.timeIntervalSinceNow > widgetTokenRefreshLeewaySeconds
    {
      return
    }
    guard let sessionToken = NucleumAuthFnCredentialStore.readSessionToken() else {
      return
    }
    requestAuthFnWidgetToken(sessionToken: sessionToken)
  }

  private func storeAuthFnSession(
    token: String?, userId: String?, regionId: String?, accountUrl: String? = nil,
    widgetToken: String? = nil
  ) {
    if let userId = userId {
      sharedDefaults?.set(userId, forKey: "userId")
    }
    if let regionId = regionId {
      sharedDefaults?.set(regionId, forKey: "userRegion")
    }
    if let token = token {
      NucleumAuthFnCredentialStore.storeSessionToken(token)
    }
    if let accountUrl = accountUrl {
      sharedDefaults?.set(accountUrl, forKey: "authfnAccountUrl")
    }
    if let widgetToken = widgetToken {
      sharedDefaults?.set(widgetToken, forKey: "authfnWidgetToken")
    }
    sharedDefaults?.removeObject(forKey: "authfnToken")
    sharedDefaults?.removeObject(forKey: "surrealToken")
    sharedDefaults?.removeObject(forKey: "refreshToken")
  }

  private func clearAuthFnSession() {
    NucleumAuthFnCredentialStore.deleteSessionToken()
    sharedDefaults?.removeObject(forKey: "authfnToken")
    sharedDefaults?.removeObject(forKey: "authfnWidgetToken")
    sharedDefaults?.removeObject(forKey: "authfnWidgetTokenExpiresAt")
    sharedDefaults?.removeObject(forKey: "surrealToken")
    sharedDefaults?.removeObject(forKey: "refreshToken")
    sharedDefaults?.removeObject(forKey: "userId")
    sharedDefaults?.removeObject(forKey: "userRegion")
    sharedDefaults?.removeObject(forKey: "authfnAccountUrl")
  }

  private func resolveAuthFnAccountUrl(_ accountUrl: String?) -> String {
    if let accountUrl = accountUrl?.trimmingCharacters(in: .whitespacesAndNewlines),
      !accountUrl.isEmpty
    {
      return accountUrl.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }
    return LocalConfig.accountUrl.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
  }

  private func exchangeAuthFnNativeHandoff(code: String, accountUrl: String? = nil) {
    let resolvedAccountUrl = resolveAuthFnAccountUrl(accountUrl)
    guard let accountBaseURL = URL(string: resolvedAccountUrl) else {
      Log.error(message: "Invalid AuthFn native handoff URL")
      return
    }

    Task {
      do {
        let credential = try await authFnClient.exchangeNativeHandoff(
          code: code,
          accountBaseURL: accountBaseURL,
          device: [
            "platform": "apple",
            "app": LocalConfig.defaultAppName,
          ]
        )
        let userId = credential.session.actorId.replacingOccurrences(of: "user:", with: "")
        let widgetToken = try? await authFnClient.requestWidgetToken(
          sessionToken: credential.token,
          accountBaseURL: accountBaseURL
        )
        DispatchQueue.main.async {
          self.storeAuthFnSession(
            token: credential.token,
            userId: userId,
            regionId: credential.session.regionId,
            accountUrl: resolvedAccountUrl,
            widgetToken: widgetToken?.token
          )
          if let expiresAt = widgetToken?.expiresAt {
            self.sharedDefaults?.set(expiresAt, forKey: "authfnWidgetTokenExpiresAt")
          }
          self.sendMessageToApp(message: [
            "authfn": ["nativeAuthenticated": true]
          ])
          self.refreshAllWidgets()
        }
      } catch {
        Log.error(message: "AuthFn native handoff exchange failed: \(error.localizedDescription)")
      }
    }
  }

  private func requestAuthFnWidgetToken(sessionToken: String, accountUrl: String? = nil) {
    let resolvedAccountUrl = resolveAuthFnAccountUrl(
      accountUrl ?? sharedDefaults?.string(forKey: "authfnAccountUrl")
    )
    guard let accountBaseURL = URL(string: resolvedAccountUrl) else {
      Log.error(message: "Invalid AuthFn widget token URL")
      return
    }

    Task {
      do {
        let widgetToken = try await authFnClient.requestWidgetToken(
          sessionToken: sessionToken,
          accountBaseURL: accountBaseURL
        )
        DispatchQueue.main.async {
          self.sharedDefaults?.set(widgetToken.token, forKey: "authfnWidgetToken")
          if let expiresAt = widgetToken.expiresAt {
            self.sharedDefaults?.set(expiresAt, forKey: "authfnWidgetTokenExpiresAt")
          }
          self.refreshAllWidgets()
        }
      } catch {
        Log.error(message: "AuthFn widget token request failed: \(error.localizedDescription)")
      }
    }
  }

  private func readAuthFnWidgetTokenExpiresAt() -> Date? {
    guard let value = sharedDefaults?.string(forKey: "authfnWidgetTokenExpiresAt") else {
      return nil
    }
    return ISO8601DateFormatter().date(from: value)
  }

  private func handleAuthFnNativeHandoff(value: Any?) {
    guard
      let payload = parseAuthFnDictionaryPayload(value),
      let code = payload["code"] as? String
    else {
      Log.error(message: "Unable to parse AuthFn native handoff payload")
      return
    }
    exchangeAuthFnNativeHandoff(code: code, accountUrl: payload["accountUrl"] as? String)
  }

  private func parseAuthFnDictionaryPayload(_ value: Any?) -> [String: Any]? {
    if let payload = value as? [String: Any] {
      return payload
    }
    guard
      let stringValue = value as? String,
      let data = stringValue.data(using: .utf8)
    else {
      return nil
    }
    return try? JSONSerialization.jsonObject(with: data) as? [String: Any]
  }

  #if os(iOS)
    private func handleAuthFnNativeAppleSignIn(value: Any?) {
      let payload = parseAuthFnDictionaryPayload(value)
      let resolvedAccountUrl = resolveAuthFnAccountUrl(payload?["accountUrl"] as? String)
      guard let accountBaseURL = URL(string: resolvedAccountUrl) else {
        sendNativeAppleSignInError("invalid_start_url")
        return
      }

      nativeAppleSignInCoordinator.start(
        client: authFnClient,
        accountBaseURL: accountBaseURL,
        returnTo: payload?["returnTo"] as? String ?? "\(LocalConfig.urlScheme)://oauthsignin",
        handoffMode: payload?["handoffMode"] as? String ?? "session-token",
        device: [
          "platform": "apple",
          "app": LocalConfig.defaultAppName,
        ],
        presentationAnchor: {
          let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene
          return scene?.windows.first
        },
        completion: { result in
          self.handleNativeAppleSignInResult(result, accountUrl: resolvedAccountUrl)
        }
      )
    }

    func startNativeAppleSignInFromAuthorizeUrl(_ urlString: String) -> Bool {
      guard let url = URL(string: urlString) else {
        return false
      }
      let oauthCoordinator = AuthFnOAuthCoordinator()
      guard let context = oauthCoordinator.appleAuthorizeContext(from: url) else {
        Log.info("Apple native authorize intercept skipped for non-Apple OAuth URL")
        return false
      }

      let fallbackAccountUrl = resolveAuthFnAccountUrl(nil)
      guard let fallbackAccountBaseURL = URL(string: fallbackAccountUrl) else {
        sendNativeAppleSignInError("invalid_authorize_url")
        return true
      }
      let resolvedAccountUrl = (context.accountBaseURL ?? fallbackAccountBaseURL)
        .absoluteString
        .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
      Log.info("Starting native Apple sign-in from AuthFn web authorize state accountUrl=\(resolvedAccountUrl)")
      return nativeAppleSignInCoordinator.startFromAuthorizeURL(
        url,
        client: authFnClient,
        fallbackAccountBaseURL: fallbackAccountBaseURL,
        device: [
          "platform": "apple",
          "app": LocalConfig.defaultAppName,
        ],
        presentationAnchor: {
          let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene
          return scene?.windows.first
        },
        completion: { result in
          self.handleNativeAppleSignInResult(result, accountUrl: resolvedAccountUrl)
        }
      )
    }

    private func handleNativeAppleSignInResult(
      _ result: Result<AuthFnNativeAppleSignInResult, AuthFnNativeAppleSignInFailure>,
      accountUrl: String
    ) {
      switch result {
      case .success(let response):
        storeAuthFnSession(
          token: response.token,
          userId: response.userId,
          regionId: response.regionId,
          accountUrl: accountUrl
        )
        requestAuthFnWidgetToken(sessionToken: response.token, accountUrl: accountUrl)
        sendMessageToApp(message: [
          "oauth": [
            "token": response.token,
            "signup": response.isNewUser == true ? "true" : "false",
            "regionId": response.regionId ?? "",
          ]
        ])
        refreshAllWidgets()
      case .failure(let error):
        Log.error(message: "Native Apple sign-in failed: \(error.code) \(error.message ?? "")")
        sendNativeAppleSignInError(error.code)
      }
    }

    private func sendNativeAppleSignInError(_ code: String) {
      sendMessageToApp(message: [
        "oauth": [
          "error": "apple_native_signin_failed",
          "errorCode": code,
          "provider": "apple",
        ]
      ])
    }
  #endif

  func refreshSpecificWidget(id: String) {
    WidgetCenter.shared.reloadTimelines(ofKind: id)
    Log.info("Reload request sent to widget with id: \(id)")
  }

  func incomingMessageWrapper(value: [String: Any?]) {
    let context = LogContext(file: #file, function: #function, line: #line, isSaveToServer: false)
    // Log.info("message from source: \(value)", context: context)
    Log.info("message from source: \(value)")
  }

  func incomingMessageHandler(value: [String: Any?]) {
    incomingMessageWrapper(value: value)
    if value.keys.contains("message") {
      if let str = value["message"] as? String {
        Log.info("message: \(str)")
        if str == IncomingMessage.PING {
          // self.isAppLoaded = true
        } else if str == IncomingMessage.MOUNT {
          self.isAppMounted = true
        } else if str == IncomingMessage.SHEET_MOUNTED {
          // Delay to avoid flickering of webview
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            self.isSheetMounted = true
          }
          // self.isSheetMounted = true
        } else if str == IncomingMessage.CLEAR_NOTIFICATIONS {
          clearAllScheduledNotifications()
        } else if str == IncomingMessage.CAMERA {
          self.isShowCamera = true
        } else if str == IncomingMessage.MENU_ITEM_SELECTED {
          performHapticFeedback("menuitem")
          self.bg = Color.hsl(self.colorScheme.colors.bgs1)
          self.bgIndex = 1
        } else if str == IncomingMessage.RESTORE_PURCHASE {
          restorePurchase()
        } else if str == IncomingMessage.CHECK_SUBSCRIPTION {
          checkSubscriptionStatus()
        } else if str == IncomingMessage.MODIFY_SUBSCRIPTION {
          openSubscriptionManagementPage()
        }
      }
    } else if value.keys.contains("data") {
      Log.info("data: \(value)")
      if let dataString = value["data"] as? String {
        let jsonData = Data(dataString.utf8)
        let decoder = JSONDecoder()
        do {
          let req = try decoder.decode(DataRequest.self, from: jsonData)
          Log.info("Data request: \(req)")
          if req.type == IncomingMessage.LOCATION {
            // Store the request for later use in delegate callbacks
            pendingLocationRequest = req

            // Cancel any existing timeout
            locationRequestTimer?.invalidate()

            // Set a timeout for the location request (10 seconds)
            locationRequestTimer = Timer.scheduledTimer(
              timeInterval: 10.0,
              target: self,
              selector: #selector(handleLocationTimeout),
              userInfo: nil,
              repeats: false
            )

            // Initialize location manager if needed
            if locationManager == nil {
              locationManager = CLLocationManager()
              locationManager?.delegate = self

              #if os(iOS)
                locationManager?.desiredAccuracy = kCLLocationAccuracyHundredMeters
              #elseif os(macOS)
                // Higher accuracy for macOS to ensure we get a response
                locationManager?.desiredAccuracy = kCLLocationAccuracyBest
              #endif
            }

            guard let manager = locationManager else {
              Log.error(message: "Failed to initialize location manager")
              locationRequestTimer?.invalidate()
              sendMessageToApp(message: [
                "id": req.id,
                "type": IncomingMessage.LOCATION,
                "data": ["error": "Failed to initialize location services"],
              ])
              pendingLocationRequest = nil
              return
            }

            Log.info("Location authorization status: \(manager.authorizationStatus.rawValue)")

            #if os(macOS)
              // macOS location handling is different - always call requestLocation directly
              // which will prompt for permission if needed
              Log.info("Requesting location on macOS")
              manager.requestLocation()
            #else
              // iOS location handling
              switch manager.authorizationStatus {
              case .notDetermined:
                Log.info("Requesting location authorization on iOS")
                manager.requestWhenInUseAuthorization()
              case .authorizedWhenInUse, .authorizedAlways:
                Log.info("Location authorized on iOS, requesting update")
                manager.requestLocation()
              case .denied, .restricted:
                Log.info("Location access denied on iOS")
                locationRequestTimer?.invalidate()
                sendMessageToApp(message: [
                  "id": req.id,
                  "type": IncomingMessage.LOCATION,
                  "data": ["error": "Location access denied"],
                ])
                pendingLocationRequest = nil
              @unknown default:
                Log.error(message: "Unknown location authorization status on iOS")
                locationRequestTimer?.invalidate()
                sendMessageToApp(message: [
                  "id": req.id,
                  "type": IncomingMessage.LOCATION,
                  "data": ["error": "Unknown location authorization status"],
                ])
                pendingLocationRequest = nil
              }
            #endif
          } else if req.type == IncomingMessage.TRANSCRIBE_AUDIO {
            Log.info("Audio transcription request received with ID: \(req.id)")
            #if os(tvOS)
              sendMessageToApp(message: [
                "id": req.id,
                "type": IncomingMessage.TRANSCRIBE_AUDIO,
                "data": ["error": "Audio transcription not supported on tvOS"],
              ])
            #else
              let input = req.body.mapValues { $0.value }
              Log.info("Input - Audio transcription: \(input)")

              // Extract additional transcription parameters
              let language = input["language"] as? String
              let model = input["model"] as? String
              let enableSpeakerDiarization = input["enableSpeakerDiarization"] as? Bool
              let enableTimestamps = input["enableTimestamps"] as? Bool
              let enableImprovedFormatting = input["enableImprovedFormatting"] as? Bool

              let metadata = JobMetadata(
                jobType: JobType.transcribeAudio.rawValue,
                originalRequestId: req.id,
                audioFilePath: nil
              )

              let jobId = jobManager.createJob(
                type: .transcribeAudio,
                input: input,
                metadata: metadata
              )

              jobManager.startJob(jobId)

              sendMessageToApp(message: [
                "id": req.id,
                "type": IncomingMessage.TRANSCRIBE_AUDIO,
                "data": ["jobId": jobId, "status": "created"],
              ])
            #endif
          } else if req.type == IncomingMessage.RETRIEVE_JOB {
            Log.info("Job retrieval request received with ID: \(req.id)")
            if let jobId = req.body["jobId"]?.value as? String {
              if let result = jobManager.getJobResult(jobId) {
                var responseData: [String: Any] = [
                  "jobId": result.id,
                  "status": result.status.rawValue,
                  "progress": result.progress,
                  "createdAt": Int(result.createdAt.timeIntervalSince1970 * 1000),
                  "updatedAt": Int(result.updatedAt.timeIntervalSince1970 * 1000),
                ]

                if let output = result.output {
                  responseData["output"] = output
                }

                if let errorMessage = result.errorMessage {
                  responseData["error"] = errorMessage
                }

                sendMessageToApp(message: [
                  "id": req.id,
                  "type": IncomingMessage.RETRIEVE_JOB,
                  "data": responseData,
                ])
              } else {
                sendMessageToApp(message: [
                  "id": req.id,
                  "type": IncomingMessage.RETRIEVE_JOB,
                  "data": ["error": "Job not found"],
                ])
              }
            } else {
              sendMessageToApp(message: [
                "id": req.id,
                "type": IncomingMessage.RETRIEVE_JOB,
                "data": ["error": "Missing jobId parameter"],
              ])
            }
          } else if req.type == IncomingMessage.DOWNLOAD_MODEL {
            Log.info("Model download request received with ID: \(req.id)")
            let input = req.body.mapValues { $0.value }

            guard let modelType = input["type"] as? String else {
              sendMessageToApp(message: [
                "id": req.id,
                "type": IncomingMessage.DOWNLOAD_MODEL,
                "data": ["error": "Missing type parameter"],
              ])
              return
            }

            let model = input["model"] as? String

            // Handle different model types
            self.handleModelDownload(
              requestId: req.id,
              modelType: modelType,
              model: model
            )
          }
        } catch {
          let context = LogContext(file: #file, function: #function, line: #line)
          Log.error(message: error.localizedDescription, context: context)
        }
      }
    } else if value.keys.contains("purchase") {
      Log.info("purchase request: \(value)")
      if let purchaseData = value["purchase"] as? [String: Any],
        let productId = purchaseData["productId"] as? String
      {
        // Optional parameters
        let offerToken = purchaseData["offerToken"] as? String
        guard let nonce = purchaseData["nonce"] as? String, !nonce.isEmpty else {
          Log.error(message: "Invalid purchase request: missing nonce")
          self.sendMessageToApp(message: [
            "type": "PURCHASE_ERROR",
            "error": "Invalid purchase request: missing nonce",
          ])
          return
        }
        handlePurchase(productId: productId, nonce: nonce, offerToken: offerToken)
      } else if let purchaseString = value["purchase"] as? String {
        // Try to parse the purchase data as a JSON string
        do {
          if let jsonData = purchaseString.data(using: .utf8),
            let purchaseDict = try JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
            let productId = purchaseDict["productId"] as? String
          {
            // Optional parameters
            let offerToken = purchaseDict["offerToken"] as? String
            guard let nonce = purchaseDict["nonce"] as? String, !nonce.isEmpty else {
              Log.error(message: "Invalid purchase request: missing nonce")
              self.sendMessageToApp(message: [
                "type": "PURCHASE_ERROR",
                "error": "Invalid purchase request: missing nonce",
              ])
              return
            }
            handlePurchase(productId: productId, nonce: nonce, offerToken: offerToken)
          } else {
            Log.error(
              message: "Invalid purchase request: missing or invalid productId in JSON string")
            self.sendMessageToApp(message: [
              "type": "PURCHASE_ERROR",
              "error": "Invalid purchase request: missing or invalid productId in JSON string",
            ])
          }
        } catch {
          Log.error(message: "Failed to parse purchase JSON string: \(error.localizedDescription)")
          self.sendMessageToApp(message: [
            "type": "PURCHASE_ERROR",
            "error": "Failed to parse purchase JSON string: \(error.localizedDescription)",
          ])
        }
      } else {
        Log.error(message: "Invalid purchase request: missing productId")
        self.sendMessageToApp(message: [
          "type": "PURCHASE_ERROR", "error": "Invalid purchase request: missing productId",
        ])
      }
    } else if value.keys.contains("colorscheme") {
      Log.info("colorscheme: \(value)")
      if let schemeString = value["colorscheme"] as? String {
        let jsonData = Data(schemeString.utf8)
        let decoder = JSONDecoder()
        do {
          let scheme = try decoder.decode(ColorScheme.self, from: jsonData)
          //                    self.bg = Color(hex: scheme.colors.bgs1)
          //                    self.fg = Color(hex: scheme.colors.fgs1)
          if self.bgIndex == 0 {
            self.bg = Color.hsl(scheme.colors.bgs1)
          }
          self.fg = Color.hsl(scheme.colors.fgs1)
          Log.info("bg: \(self.bg), fg: \(self.fg)")
          self.colorScheme = scheme
          self.sharedDefaults?.set(schemeString, forKey: "scheme")
          self.refreshAllWidgets()
        } catch {
          let context = LogContext(file: #file, function: #function, line: #line)
          Log.error(message: error.localizedDescription, context: context)
        }
      } else {
        let context = LogContext(file: #file, function: #function, line: #line)
        Log.error(message: "Unable to read colorscheme as string", context: context)
      }
    } else if value.keys.contains("modal") {
      Log.info("modal: \(value)")
      if let popString = value["modal"] as? String {
        let jsonData = Data(popString.utf8)
        let decoder = JSONDecoder()
        do {
          let pop = try decoder.decode(Popup.self, from: jsonData)
          if !pop.path.isEmpty {
            self.popup = pop
            Log.info("popup - path: \(pop.path), isShow: \(pop.isShow) ")
            self.isSheetMounted = false
            self.isShowSheet = pop.isShow
            // self.isShowSheet = true
          }
        } catch {
          let context = LogContext(file: #file, function: #function, line: #line)
          Log.error(message: error.localizedDescription, context: context)
        }
      }
    } else if value.keys.contains("download") {
      Log.info("Download message received")
      if let downloadString = value["download"] as? String {
        let jsonData = Data(downloadString.utf8)
        let decoder = JSONDecoder()
        do {
          let req = try decoder.decode(DownloadRequest.self, from: jsonData)
          Log.info("Download request received")
          if let path = req.url {
            #if os(iOS)
              self.downloadFileWithFolderSelection(
                path, fileName: req.filename, requestId: req.id)
            #elseif os(macOS)
              self.downloadFile(path, fileName: req.filename, requestId: req.id)
            #endif
          } else if let data = req.data {
            self.downloadData(data, fileName: req.filename, requestId: req.id)
          } else {
            self.sendDownloadResult(requestId: req.id, success: false)
          }
        } catch {
          let context = LogContext(file: #file, function: #function, line: #line)
          Log.error(message: error.localizedDescription, context: context)
        }
      }
    } else if value.keys.contains("haptic") {
      if let feedback = value["haptic"] as? String {
        Log.info("haptic - feedback: \(feedback)")
        performHapticFeedback(feedback)
      }
    } else if value.keys.contains("bg") {
      if let bgShade = value["bg"] as? Int {
        Log.info("bg: \(bgShade)")
        self.isShowModalOverlay = false
        if bgShade == 2 {
          self.bg = Color.hsl(self.colorScheme.colors.bgs2)
          self.bgIndex = 2
        } else if bgShade == 1 {
          self.bg = Color.hsl(self.colorScheme.colors.bgs1)
          self.bgIndex = 1
        } else if bgShade == 100 {
          self.isShowModalOverlay = true
          self.bgIndex = 100
        }
      }
    } else if value.keys.contains("authfn.nativeHandoffRequested") {
      handleAuthFnNativeHandoff(value: value["authfn.nativeHandoffRequested"] ?? nil)
    } else if value.keys.contains("authfn.nativeAppleSignInRequested") {
      #if os(iOS)
      handleAuthFnNativeAppleSignIn(value: value["authfn.nativeAppleSignInRequested"] ?? nil)
      #else
        Log.error(message: "Native Apple sign-in is only available on iOS")
      #endif
    } else if value.keys.contains("account") {
      if let strValue = value["account"] as? String {
        Log.info("account info received")
        let jsonData = Data(strValue.utf8)
        let decoder = JSONDecoder()
        do {
          let data = try decoder.decode(Account.self, from: jsonData)
          if data.isLoggedIn {
            storeAuthFnSession(
              token: data.token,
              userId: data.userId,
              regionId: data.regionId,
              accountUrl: data.accountUrl,
              widgetToken: data.widgetToken
            )
            if let token = data.token, data.widgetToken == nil {
              requestAuthFnWidgetToken(sessionToken: token, accountUrl: data.accountUrl)
            }
            self.refreshAllWidgets()
          } else {
            Log.info("Account not logged in")
            clearAuthFnSession()
          }
        } catch {
          let context = LogContext(file: #file, function: #function, line: #line)
          Log.error(message: error.localizedDescription, context: context)
        }
      } else {
        let context = LogContext(file: #file, function: #function, line: #line)
        Log.error(message: "Unable to read account info as string", context: context)
      }
    } else if value.keys.contains("notifications") {
      if let notificationsArray = value["notifications"] as? [[String: AnyObject]] {
        do {
          let jsonData = try JSONSerialization.data(withJSONObject: notificationsArray, options: [])
          let decoder = JSONDecoder()
          let data = try decoder.decode([AppNotification].self, from: jsonData)
          if data.count > 0 {
            clearAllScheduledNotifications()
            scheduleNotifications(data)
          }
          print("Parsed Notifications: \(data)")
        } catch {
          let context = LogContext(file: #file, function: #function, line: #line)
          Log.error(message: error.localizedDescription, context: context)
        }
      } else {
        Log.error(message: "Unable to parse notifications")
      }
    } else if value.keys.contains("notification") {
      Log.info("notification: \(value)")
      if let notificationString = value["notification"] as? String {
        let jsonData = Data(notificationString.utf8)
        let decoder = JSONDecoder()
        do {
          let notification = try decoder.decode(InAppNotification.self, from: jsonData)
          if notification.sound != nil {
            Log.info("Parsed sound \(notification.sound)")
            // playAlertSound(named: notification.sound!)
            #if os(macOS)
              if let sound = NSSound(named: notification.sound!) {
                Log.info("Playing using NSSound sound \(notification.sound)")
                sound.play()
              }
            #endif
          }
        } catch {
          let context = LogContext(file: #file, function: #function, line: #line)
          Log.error(message: error.localizedDescription, context: context)
        }
      } else {
        Log.error(message: "Unable to parse notification")
      }
    }
  }

  // Helper method to handle purchase logic
  private func handlePurchase(productId: String, nonce: String, offerToken: String?) {
    Log.info("Initiating purchase for product: \(productId)")

    let storeManager = StoreManager.shared
    storeManager.purchaseProduct(
      productId: productId, offerToken: offerToken
    ) { success, error, subscriptionInfo in
      DispatchQueue.main.async {
        if success {
          Log.info("Successfully purchased product: \(productId)")
          // Convert and send subscription data
          let subscriptionData = self.convertSubscriptionInfoToDict(subscriptionInfo)
          // First send to API
          self.sendPaymentMessageToApi(message: [
            "type": "PURCHASE_SUCCESS",
            "productId": productId,
            "embedTransaction": subscriptionData,
            "nonce": nonce,
          ]) { data, error in
            // After API call completes, send to app
            DispatchQueue.main.async {
              self.sendMessageToApp(message: [
                "type": "PURCHASE_SUCCESS",
                "productId": productId,
                "embedTransaction": subscriptionData,
                "nonce": nonce,
                  // "apiResponse": data,
              ])
            }
          }
        } else {
          Log.error(
            message:
              "Failed to purchase product: \(error?.localizedDescription ?? "Unknown error")")
          self.sendMessageToApp(message: [
            "type": "PURCHASE_ERROR", "productId": productId,
            "error": error?.localizedDescription ?? "Unknown error",
          ])
        }
      }
    }
  }

  func downloadFileWithFolderSelection(
    _ urlString: String, fileName: String?, requestId: String?
  ) {
    guard let url = URL(string: urlString), isAllowedExternalUrl(url) else {
      Log.error(message: "Rejected download URL: \(redactUrlForLog(urlString))")
      sendDownloadResult(requestId: requestId, success: false)
      return
    }

    let task = URLSession.shared.downloadTask(with: url) { (tempLocalUrl, response, error) in
      if let error = error {
        Log.error(message: "Download error: \(error.localizedDescription)")
        self.sendDownloadResult(requestId: requestId, success: false)
        return
      }

      guard let httpResponse = response as? HTTPURLResponse,
        (200...299).contains(httpResponse.statusCode)
      else {
        Log.error(message: "Server error")
        self.sendDownloadResult(requestId: requestId, success: false)
        return
      }

      guard let tempLocalUrl = tempLocalUrl else {
        Log.error(message: "No local temporary URL")
        self.sendDownloadResult(requestId: requestId, success: false)
        return
      }

      let fileName = resolveDownloadFileName(
        fileName ?? httpResponse.suggestedFilename ?? url.lastPathComponent)
      let properFileUrl = tempLocalUrl.deletingPathExtension().appendingPathExtension(
        fileName.components(separatedBy: ".").last ?? "")

      do {
        try FileManager.default.moveItem(at: tempLocalUrl, to: properFileUrl)
        self.deliverDownloadedFile(
          properFileUrl, fileName: fileName, requestId: requestId, cleanupUrl: properFileUrl)
      } catch {
        Log.error(message: "Error preparing file: \(error.localizedDescription)")
        self.sendDownloadResult(requestId: requestId, success: false)
      }
    }

    task.resume()
  }

  func fetchData(from urlString: String, id: String, completion: @escaping (String) -> Void) {
    guard let url = URL(string: urlString), isAllowedExternalUrl(url) else {
      Log.error(message: "Rejected fetch URL: \(redactUrlForLog(urlString))")
      let errorMessage = """
            {
                "type": "FETCH_ERROR",
                "id": "\(id)",
                "error": "Invalid URL"
            }
        """
      completion(errorMessage)
      return
    }

    let task = URLSession.shared.dataTask(with: url) { (data, response, error) in
      if let error = error {
        Log.error(message: "Fetch error: \(error.localizedDescription)")
        let errorMessage = """
              {
                  "type": "FETCH_ERROR",
                  "id": "\(id)",
                  "error": "\(error.localizedDescription)"
              }
          """
        completion(errorMessage)
        return
      }

      guard let httpResponse = response as? HTTPURLResponse,
        let data = data
      else {
        Log.error(message: "Invalid response or no data received")
        return
      }

      let contentType =
        httpResponse.value(forHTTPHeaderField: "Content-Type") ?? "application/octet-stream"

      // Try to parse as JSON first
      if let json = try? JSONSerialization.jsonObject(with: data),
        let jsonData = try? JSONSerialization.data(withJSONObject: json, options: [.prettyPrinted]),
        let jsonString = String(data: jsonData, encoding: .utf8)
      {

        let wrappedMessage = """
              {
                  "type": "FETCH_RESPONSE",
                  "id": "\(id)",
                  "status": \(httpResponse.statusCode),
                  "contentType": "\(contentType)",
                  "data": \(jsonString)
              }
          """
        Log.info("Fetch response: \(wrappedMessage)")
        completion(wrappedMessage)

      } else if let stringData = String(data: data, encoding: .utf8),
        contentType.contains("text/") || contentType.contains("application/json")
      {
        let wrappedMessage = """
              {
                  "type": "FETCH_RESPONSE",
                  "id": "\(id)",
                  "status": \(httpResponse.statusCode),
                  "contentType": "\(contentType)",
                  "data": "\(stringData.replacingOccurrences(of: "\"", with: "\\\""))"
              }
          """
        completion(wrappedMessage)
      } else {
        let base64String = data.base64EncodedString()
        let wrappedMessage = """
              {
                  "type": "FETCH_RESPONSE",
                  "id": "\(id)",
                  "status": \(httpResponse.statusCode),
                  "contentType": "\(contentType)",
                  "data": "\(base64String)"
              }
          """
        Log.info("Fetch binary response with content type: \(contentType)")
        completion(wrappedMessage)
      }
    }

    task.resume()
  }

  func downloadFile(_ urlString: String, fileName: String?, requestId: String?) {
    guard let url = URL(string: urlString), isAllowedExternalUrl(url) else {
      Log.error(message: "Rejected download URL: \(redactUrlForLog(urlString))")
      sendDownloadResult(requestId: requestId, success: false)
      return
    }

    let task = URLSession.shared.downloadTask(with: url) { tempLocalUrl, response, error in
      if let error = error {
        Log.error(message: "Download error: \(error.localizedDescription)")
        self.sendDownloadResult(requestId: requestId, success: false)
        return
      }

      guard let tempLocalUrl = tempLocalUrl, let response = response as? HTTPURLResponse else {
        Log.error(message: "No temporary file URL or invalid response")
        self.sendDownloadResult(requestId: requestId, success: false)
        return
      }

      guard (200...299).contains(response.statusCode) else {
        Log.error(message: "Server error with status code: \(response.statusCode)")
        self.sendDownloadResult(requestId: requestId, success: false)
        return
      }

      let fileName = self.resolveDownloadFileName(
        fileName ?? response.suggestedFilename ?? url.lastPathComponent)
      self.deliverDownloadedFile(
        tempLocalUrl, fileName: fileName, requestId: requestId, cleanupUrl: nil)
    }

    task.resume()
  }

  func downloadData(_ encodedData: String, fileName: String?, requestId: String?) {
    guard let data = Data(base64Encoded: encodedData) else {
      sendDownloadResult(requestId: requestId, success: false)
      return
    }
    let resolvedFileName = resolveDownloadFileName(fileName)
    let temporaryDirectory = FileManager.default.temporaryDirectory.appendingPathComponent(
      UUID().uuidString, isDirectory: true)
    let temporaryUrl = temporaryDirectory.appendingPathComponent(resolvedFileName)
    do {
      try FileManager.default.createDirectory(
        at: temporaryDirectory, withIntermediateDirectories: true)
      try data.write(to: temporaryUrl, options: .atomic)
      deliverDownloadedFile(
        temporaryUrl, fileName: resolvedFileName, requestId: requestId,
        cleanupUrl: temporaryDirectory)
    } catch {
      try? FileManager.default.removeItem(at: temporaryDirectory)
      sendDownloadResult(requestId: requestId, success: false)
    }
  }

  private func resolveDownloadFileName(_ fileName: String?) -> String {
    guard let fileName = fileName?.trimmingCharacters(in: .whitespacesAndNewlines),
      !fileName.isEmpty
    else {
      return "download"
    }
    let resolvedFileName = URL(fileURLWithPath: fileName).lastPathComponent
    return resolvedFileName.isEmpty ? "download" : resolvedFileName
  }

  private func deliverDownloadedFile(
    _ sourceUrl: URL, fileName: String, requestId: String?, cleanupUrl: URL?
  ) {
    #if os(macOS)
      let fileManager = FileManager.default
      let downloadsDirectory = fileManager.urls(for: .downloadsDirectory, in: .userDomainMask)[0]
      let destinationUrl = downloadsDirectory.appendingPathComponent(fileName)
      do {
        try? fileManager.removeItem(at: destinationUrl)
        try fileManager.copyItem(at: sourceUrl, to: destinationUrl)
        if let cleanupUrl = cleanupUrl {
          try? fileManager.removeItem(at: cleanupUrl)
        }
        Log.info("File downloaded successfully to: \(destinationUrl.path)")
        sendDownloadResult(requestId: requestId, success: true)
      } catch {
        if let cleanupUrl = cleanupUrl {
          try? fileManager.removeItem(at: cleanupUrl)
        }
        Log.error(message: "File copy error: \(error.localizedDescription)")
        sendDownloadResult(requestId: requestId, success: false)
      }
    #elseif os(iOS)
      DispatchQueue.main.async {
        let documentPicker = UIDocumentPickerViewController(forExporting: [sourceUrl])
        documentPicker.delegate = self
        documentPicker.modalPresentationStyle = .formSheet
        documentPicker.shouldShowFileExtensions = true
        let pickerId = ObjectIdentifier(documentPicker)
        if let requestId = requestId {
          self.pendingDownloadRequestIds[pickerId] = requestId
        }
        if let cleanupUrl = cleanupUrl {
          self.pendingDownloadCleanupUrls[pickerId] = cleanupUrl
        }
        if #available(iOS 13.0, *) {
          documentPicker.directoryURL =
            FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
        }
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
          let rootVC = windowScene.windows.first?.rootViewController
        {
          rootVC.present(documentPicker, animated: true)
        } else {
          Log.error(message: "Could not find root view controller")
          self.pendingDownloadRequestIds.removeValue(forKey: pickerId)
          if let cleanupUrl = self.pendingDownloadCleanupUrls.removeValue(forKey: pickerId) {
            try? FileManager.default.removeItem(at: cleanupUrl)
          }
          self.sendDownloadResult(requestId: requestId, success: false)
        }
      }
    #endif
  }

  func sendMessageToApp(message: [String: Any]) {
    do {
      let jsonData = try JSONSerialization.data(withJSONObject: message, options: [])
      if let jsonString = String(data: jsonData, encoding: .utf8) {
        // Post a notification that can be observed by the component containing the webView
        NotificationCenter.default.post(
          name: Notification.Name("AppStoreMessageToApp"),
          object: nil,
          userInfo: ["message": jsonString]
        )
        Log.info("Posted app message notification: \(message)")
      }
    } catch {
      Log.error(message: "Failed to serialize message: \(error.localizedDescription)")
    }
  }

  private func sendDownloadResult(requestId: String?, success: Bool) {
    guard let requestId = requestId else { return }
    DispatchQueue.main.async {
      self.sendMessageToApp(message: [
        "type": success ? "DOWNLOAD_SUCCESS" : "DOWNLOAD_ERROR",
        "id": requestId,
      ])
    }
  }

  func sendPaymentMessageToApi(
    message: [String: Any], completion: @escaping (Data?, Error?) -> Void
  ) {
    Utils.performApiCall(
      endpoint: "/v2/plan/verify",
      request: message,
      method: "POST"
    ) { data, error in
      completion(data, error)
    }
  }

  // Method to open the App Store subscription management page
  func openSubscriptionManagementPage() {
    Log.info("Opening subscription management page")

    #if os(iOS)
      if let url = URL(string: "itms-apps://apps.apple.com/account/subscriptions") {
        DispatchQueue.main.async {
          if UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url, options: [:]) { success in
              if success {
                Log.info("Successfully opened subscription management page")
                self.sendMessageToApp(message: [
                  "type": "SUBSCRIPTION_MANAGEMENT_OPENED"
                ])
              } else {
                Log.error(message: "Failed to open subscription management page")
                self.sendMessageToApp(message: [
                  "type": "SUBSCRIPTION_MANAGEMENT_ERROR",
                  "error": "Failed to open subscription management page",
                ])
              }
            }
          } else {
            Log.error(message: "Cannot open subscription management URL")
            self.sendMessageToApp(message: [
              "type": "SUBSCRIPTION_MANAGEMENT_ERROR",
              "error": "Cannot open subscription management URL",
            ])
          }
        }
      } else {
        Log.error(message: "Invalid subscription management URL")
        self.sendMessageToApp(message: [
          "type": "SUBSCRIPTION_MANAGEMENT_ERROR",
          "error": "Invalid subscription management URL",
        ])
      }
    #elseif os(macOS)
      if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
        DispatchQueue.main.async {
          NSWorkspace.shared.open(url)
          Log.info("Opened subscription management page in browser")
          self.sendMessageToApp(message: [
            "type": "SUBSCRIPTION_MANAGEMENT_OPENED"
          ])
        }
      } else {
        Log.error(message: "Invalid subscription management URL")
        self.sendMessageToApp(message: [
          "type": "SUBSCRIPTION_MANAGEMENT_ERROR",
          "error": "Invalid subscription management URL",
        ])
      }
    #endif
  }

  // MARK: - CLLocationManagerDelegate Methods

  // Model download methods
  private func downloadTranscriptionModel(model: String, requestId: String) {
    guard let aiServiceProvider = self.aiServiceProvider else {
      sendMessageToApp(message: [
        "id": requestId,
        "type": IncomingMessage.DOWNLOAD_MODEL,
        "data": ["error": "AI service not available"],
      ])
      return
    }

    let modelKey = "transcription-\(model)"

    // Check if model is already downloaded (use AIServiceProvider to verify actual file existence)
    if aiServiceProvider.isModelDownloaded(modelType: model) {
      modelDownloadStatuses[modelKey] = true
      sendMessageToApp(message: [
        "id": requestId,
        "type": IncomingMessage.DOWNLOAD_MODEL,
        "data": [
          "isDownloaded": true,
          "progress": 1.0,
          "modelType": "transcription",
          "model": model,
        ],
      ])
      return
    }

    // Initialize progress tracking
    modelDownloadProgress[modelKey] = 0.0
    Log.info("Starting download for model: \(model)")

    // Start download with progress callback
    aiServiceProvider.downloadModel(
      modelType: model,
      progressCallback: { [weak self] progress in
        guard let self = self else { return }

        DispatchQueue.main.async {
          self.modelDownloadProgress[modelKey] = progress

          // Send progress update to app
          self.sendMessageToApp(message: [
            "id": requestId,
            "type": IncomingMessage.DOWNLOAD_MODEL,
            "data": [
              "isDownloaded": false,
              "progress": progress,
              "modelType": "transcription",
              "model": model,
            ],
          ])
        }
      }
    ) { [weak self] result in
      guard let self = self else { return }

      DispatchQueue.main.async {
        switch result {
        case .success:
          Log.info("Successfully downloaded model: \(model)")
          self.modelDownloadStatuses[modelKey] = true
          self.modelDownloadProgress.removeValue(forKey: modelKey)

          self.sendMessageToApp(message: [
            "id": requestId,
            "type": IncomingMessage.DOWNLOAD_MODEL,
            "data": [
              "isDownloaded": true,
              "progress": 1.0,
              "modelType": "transcription",
              "model": model,
            ],
          ])

        case .failure(let error):
          Log.error(message: "Failed to download model \(model): \(error.localizedDescription)")
          self.modelDownloadProgress.removeValue(forKey: modelKey)

          self.sendMessageToApp(message: [
            "id": requestId,
            "type": IncomingMessage.DOWNLOAD_MODEL,
            "data": [
              "error": error.localizedDescription,
              "modelType": "transcription",
              "model": model,
            ],
          ])
        }
      }
    }
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    Log.info("Location update received")
    // Cancel the timeout timer
    locationRequestTimer?.invalidate()

    guard let location = locations.last, let req = pendingLocationRequest else {
      return
    }

    let locationData: [String: Any] = [
      "latitude": location.coordinate.latitude,
      "longitude": location.coordinate.longitude,
      "accuracy": location.horizontalAccuracy,
    ]

    sendMessageToApp(message: [
      "id": req.id,
      "type": IncomingMessage.LOCATION,
      "data": locationData,
    ])

    // Clear pending request
    pendingLocationRequest = nil
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    Log.error(message: "Location update failed: \(error.localizedDescription)")
    // Cancel the timeout timer
    locationRequestTimer?.invalidate()

    if let req = pendingLocationRequest {
      sendMessageToApp(message: [
        "id": req.id,
        "type": IncomingMessage.LOCATION,
        "data": ["error": error.localizedDescription],
      ])

      // Clear pending request
      pendingLocationRequest = nil
    }
  }

  // Add a timeout handler for location requests
  @objc private func handleLocationTimeout() {
    Log.error(message: "Location request timed out")

    if let req = pendingLocationRequest {
      sendMessageToApp(message: [
        "id": req.id,
        "type": IncomingMessage.LOCATION,
        "data": ["error": "Location request timed out"],
      ])

      // Clear pending request
      pendingLocationRequest = nil
      locationRequestTimer?.invalidate()
      locationRequestTimer = nil
    }
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    Log.info("Location authorization status changed: \(manager.authorizationStatus.rawValue)")

    #if os(iOS)
      // Only handle this on iOS, on macOS we always call requestLocation directly
      switch manager.authorizationStatus {
      case .authorizedWhenInUse, .authorizedAlways:
        if pendingLocationRequest != nil {
          Log.info("Processing pending location request after authorization on iOS")
          manager.requestLocation()
        }
      case .denied, .restricted:
        if let req = pendingLocationRequest {
          locationRequestTimer?.invalidate()
          sendMessageToApp(message: [
            "id": req.id,
            "type": IncomingMessage.LOCATION,
            "data": ["error": "Location access denied"],
          ])

          // Clear pending request
          pendingLocationRequest = nil
        }
      default:
        break
      }
    #endif
  }

  // MARK: - JobManagerDelegate Methods

  func jobDidUpdateProgress(_ jobId: String, progress: Double) {
    Log.info("Job \(jobId) progress updated: \(progress)")
  }

  func jobDidComplete(_ jobId: String, result: JobResult) {
    Log.info("Job \(jobId) completed with status: \(result.status.rawValue)")

    if let metadata = fetchJobMetadata(jobId),
      let originalRequestId = metadata.originalRequestId
    {
      var responseData: [String: Any] = [
        "jobId": jobId,
        "status": result.status.rawValue,
        "progress": result.progress,
      ]

      if let output = result.output {
        responseData["output"] = output
      }

      sendMessageToApp(message: [
        "id": originalRequestId,
        "type": IncomingMessage.TRANSCRIBE_AUDIO,
        "data": responseData,
      ])
    }
  }

  func jobDidFail(_ jobId: String, error: Error) {
    Log.error(message: "Job \(jobId) failed: \(error.localizedDescription)")

    if let metadata = fetchJobMetadata(jobId),
      let originalRequestId = metadata.originalRequestId
    {
      sendMessageToApp(message: [
        "id": originalRequestId,
        "type": IncomingMessage.TRANSCRIBE_AUDIO,
        "data": [
          "jobId": jobId,
          "status": JobStatus.failed.rawValue,
          "error": error.localizedDescription,
        ],
      ])
    }
  }

  private func fetchJobMetadata(_ jobId: String) -> JobMetadata? {
    if let result = jobManager.getJobResult(jobId),
      let job = fetchJobFromCoreData(jobId),
      let metadataData = job.metadata
    {
      return try? JSONDecoder().decode(JobMetadata.self, from: metadataData)
    }
    return nil
  }

  private func fetchJobFromCoreData(_ jobId: String) -> Job? {
    let context = CoreDataStack.shared.context
    let request: NSFetchRequest<Job> = Job.fetchRequest()
    request.predicate = NSPredicate(format: "id == %@", jobId)

    do {
      let jobs = try context.fetch(request)
      return jobs.first
    } catch {
      Log.error(message: "Failed to fetch job from Core Data: \(error)")
      return nil
    }
  }

  private func handleModelDownload(
    requestId: String,
    modelType: String,
    model: String?
  ) {
    guard let aiServiceProvider = self.aiServiceProvider else {
      sendMessageToApp(message: [
        "id": requestId,
        "type": IncomingMessage.DOWNLOAD_MODEL,
        "data": ["error": "AI service not available"],
      ])
      return
    }

    // Validate model type
    guard let supportedModelsList = supportedModels[modelType] else {
      sendMessageToApp(message: [
        "id": requestId,
        "type": IncomingMessage.DOWNLOAD_MODEL,
        "data": ["error": "Unsupported model type: \(modelType)"],
      ])
      return
    }

    // Handle transcription models
    if modelType == "transcription" {
      let modelName = model ?? "tiny"

      // Validate model name
      if !supportedModelsList.isEmpty && !supportedModelsList.contains(modelName) {
        sendMessageToApp(message: [
          "id": requestId,
          "type": IncomingMessage.DOWNLOAD_MODEL,
          "data": [
            "error":
              "Unsupported model '\(modelName)' for type '\(modelType)'. Supported models: \(supportedModelsList.joined(separator: ", "))"
          ],
        ])
        return
      }

      let modelKey = "\(modelType)-\(modelName)"

      // Check if model is already downloaded (verify both cached status and actual file existence)
      let isCachedAsDownloaded = modelDownloadStatuses[modelKey] ?? false
      let isActuallyDownloaded = aiServiceProvider.isModelDownloaded(modelType: modelName)

      if isActuallyDownloaded {
        // Update cache if it was incorrect
        if !isCachedAsDownloaded {
          modelDownloadStatuses[modelKey] = true
        }

        sendMessageToApp(message: [
          "id": requestId,
          "type": IncomingMessage.DOWNLOAD_MODEL,
          "data": [
            "isDownloaded": true,
            "progress": 1.0,
            "modelType": modelType,
            "model": modelName,
          ],
        ])
        return
      } else if isCachedAsDownloaded {
        // Cache was incorrect, clear it
        modelDownloadStatuses[modelKey] = false
      }

      // Check if download is in progress
      if let currentProgress = modelDownloadProgress[modelKey] {
        sendMessageToApp(message: [
          "id": requestId,
          "type": IncomingMessage.DOWNLOAD_MODEL,
          "data": [
            "isDownloaded": false,
            "progress": currentProgress,
            "modelType": modelType,
            "model": modelName,
          ],
        ])
        return
      }

      // Start download
      self.downloadTranscriptionModel(model: modelName, requestId: requestId)

    } else if modelType == "summarization" {
      // Future: Handle summarization models
      sendMessageToApp(message: [
        "id": requestId,
        "type": IncomingMessage.DOWNLOAD_MODEL,
        "data": ["error": "Summarization models not yet supported"],
      ])

    } else {
      // Handle other future model types
      sendMessageToApp(message: [
        "id": requestId,
        "type": IncomingMessage.DOWNLOAD_MODEL,
        "data": ["error": "Model type '\(modelType)' not yet implemented"],
      ])
    }
  }
}

func playAlertSound(named soundName: String) {
  do {
    // Bundle.main.url(forResource: soundName, withExtension: "wav")
    let urlRaw = URL(fileURLWithPath: soundName)
    let fileName = urlRaw.deletingPathExtension().lastPathComponent
    let fileExtension = urlRaw.pathExtension
    guard let url = Bundle.main.url(forResource: fileName, withExtension: fileExtension) else {
      Log.error(message: "Sound file not found: \(soundName)")
      return
    }
    do {
      let player = try AVAudioPlayer(contentsOf: url)
      player.volume = 0.8  // Set volume (0.0 to 1.0)
      Log.info("Playing sound: \(soundName)")
      player.play()
    } catch {
      Log.error(message: "Failed to play sound: \(error.localizedDescription)")
    }
  } catch {
    Log.error(message: "Error while playing sound: \(error.localizedDescription)")
  }
}

class SoundPlayer {
  static let shared = SoundPlayer()
  var audioPlayer: AVAudioPlayer?

  func playAlertSound(named soundName: String) {
    do {
      let urlRaw = URL(fileURLWithPath: soundName)
      let fileName = urlRaw.deletingPathExtension().lastPathComponent
      let fileExtension = urlRaw.pathExtension

      if let path = Bundle.main.path(forResource: fileName, ofType: fileExtension) {
        Log.info("Sound file exists at path: \(path)")
      } else {
        Log.error(message: "Sound file does not exist in bundle")
      }

      guard let url = Bundle.main.url(forResource: fileName, withExtension: fileExtension) else {
        Log.error(message: "Sound file not found: \(soundName)")
        return
      }

      #if os(iOS)
        try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        try AVAudioSession.sharedInstance().setActive(true)
      #endif

      audioPlayer = try AVAudioPlayer(contentsOf: url)
      audioPlayer?.volume = 0.8
      audioPlayer?.prepareToPlay()

      if audioPlayer?.play() == true {
        Log.info("Playing sound: \(soundName)")
      } else {
        Log.error(message: "Failed to play sound: \(soundName)")
      }
    } catch {
      Log.error(message: "Error while playing sound: \(error.localizedDescription)")
    }
  }
}

#if os(iOS)
  // Add UIDocumentPickerDelegate conformance through an extension
  extension AppStore: UIDocumentPickerDelegate {
    func documentPicker(
      _ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]
    ) {
      let pickerId = ObjectIdentifier(controller)
      let requestId = pendingDownloadRequestIds.removeValue(forKey: pickerId)
      if let cleanupUrl = pendingDownloadCleanupUrls.removeValue(forKey: pickerId) {
        try? FileManager.default.removeItem(at: cleanupUrl)
      }
      if let selectedURL = urls.first {
        Log.info("File saved to: \(selectedURL.path)")
        sendDownloadResult(requestId: requestId, success: true)
      } else {
        sendDownloadResult(requestId: requestId, success: false)
      }
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
      Log.info("Document picker was cancelled")
      let pickerId = ObjectIdentifier(controller)
      let requestId = pendingDownloadRequestIds.removeValue(forKey: pickerId)
      if let cleanupUrl = pendingDownloadCleanupUrls.removeValue(forKey: pickerId) {
        try? FileManager.default.removeItem(at: cleanupUrl)
      }
      sendDownloadResult(requestId: requestId, success: false)
    }
  }
#endif
