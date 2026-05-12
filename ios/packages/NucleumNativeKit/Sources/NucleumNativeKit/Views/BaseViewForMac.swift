//
//  BaseViewForMac.swift
//  Pointron for Mac
//
//  Created by Ar on 3/9/24.
//

import AVFoundation
import AuthenticationServices
import Network
import SwiftUI
import WidgetKit

struct BaseViewForMac: View {
  @Environment(\.scenePhase) var scenePhase
  @EnvironmentObject var appStore: AppStore
  let monitor = NWPathMonitor()
  @State var isOffline = false
  @State var isReloading = false
  @State private var needsRefresh = false
  @State var webOrigin: String = LocalConfig.webOrigin
  @State var message = ""
  @State var isShowOauthFlow = false
  @State private var src: WebViewForMac = WebViewForMac(
    urlType: .customProtocolUrl,
    url: URL(string: LocalConfig.webOrigin)!,
    // params: ["debug": "true"],
    params: [:],
    refreshId: TimeUtils.getCurrentTimeInUTC(),
    viewModel: WebViewModel()
  )
  var body: some View {
    ZStack {
      appStore.bg.edgesIgnoringSafeArea(.top)
      VStack {
        self.src
      }.onReceive(self.src.viewModel.messageFromSource.receive(on: RunLoop.main)) { value in
        localMessageHandler(value: value)
      }
      if appStore.isAppMounted == false {
        LoadingOverlay()
      }
      if isShowOauthFlow {
        WebAuthenticationView(
          url: URL(string: appStore.oauthUrl)!, callbackURLScheme: LocalConfig.urlScheme
        ) {
          callbackURL, error in
          DispatchQueue.main.async {
            isShowOauthFlow = false
            if let callbackURL = callbackURL {
              print("Success: \(callbackURL)")
              processOauthResponse(callbackURL)
            } else if let error = error {
              print("Error: \(error.localizedDescription)")
            }
          }
        }
      }
    }
    .edgesIgnoringSafeArea(.bottom)
    .onAppear(perform: onActive)
    .onOpenURL { url in
      handleCustomURL(url)
    }
    .onChange(of: scenePhase) { newScenePhase in
      switch newScenePhase {
      case .active:
        onActive()
      case .inactive:
        Log.info("App is inactive")
      case .background:
        Log.info("App is in background")
        appStore.sharedDefaults?.set("background", forKey: "previousScenePhase")
        appStore.sharedDefaults?.set(Date().timeIntervalSince1970, forKey: "backgrounded")
      @unknown default:
        Log.info("Unknown scenePhase")
      }
    }
    .sheet(
      isPresented: $appStore.isShowSheet,
      content: {
        //TODO - modal for mac
      }
    )
    .onReceive(NotificationCenter.default.publisher(for: Notification.Name("AppStoreMessageToApp")))
    { notification in
      if let message = notification.userInfo?["message"] as? String {
        Log.info("Received AppStoreMessageToApp notification: \(message)")
        self.src.viewModel.valuePublisher.send(message)
      }
    }
  }

  func localMessageHandler(value: [String: Any?]) {
    if value.keys.contains("session") {
      if let sessionDataString = value["session"] as? String {
        appStore.sharedDefaults?.set(sessionDataString, forKey: "sessionData")
        appStore.refreshAllWidgets()
      } else {
        Log.error(message: "Unable to parse session data message")
      }
      appStore.incomingMessageWrapper(value: value)
    } else if value.keys.contains("link") {
      if let url = value["link"] as? String {
        Log.info("link - url: \(url)")
        openURLInSafari(url)
        // showPIP()
      } else {
        Log.error(message: "Unable to parse link message")
      }
      appStore.incomingMessageWrapper(value: value)
    } else if value.keys.contains("fetch") {
      Log.info("fetch: \(value)")
      if let fetchString = value["fetch"] as? String {
        let jsonData = Data(fetchString.utf8)
        let decoder = JSONDecoder()
        do {
          let req = try decoder.decode(FetchRequest.self, from: jsonData)
          Log.info("Fetch request: \(req)")
          appStore.fetchData(from: req.url, id: req.id) { response in
            self.src.viewModel.valuePublisher.send(response)
          }
        } catch {
          let context = LogContext(file: #file, function: #function, line: #line)
          Log.error(message: error.localizedDescription, context: context)
        }
      }
    } else if value.keys.contains("oauth") {
      if let url = value["oauth"] as? String {
        Log.info("oauth - url: \(url)")
        openOauthFlow(url)
      } else {
        Log.error(message: "Unable to parse oauth message")
      }
      appStore.incomingMessageWrapper(value: value)
    } else if value.keys.contains("pip") {
      if let val = value["pip"] as? String {
        Log.info("pip - value: \(val)")
        showPIP()
      } else {
        Log.error(message: "Unable to parse link message")
      }
      appStore.incomingMessageWrapper(value: value)
    } else {
      appStore.incomingMessageHandler(value: value)
    }
  }
  func openURLInSafari(_ urlString: String) {
    if let url = URL(string: urlString) {
      NSWorkspace.shared.open(url)
    }
  }

  func showPIP() {
    let focusTimerWindow = NSWindow(
      contentRect: NSRect(x: 20, y: 20, width: 300, height: 200),
      styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
      backing: .buffered, defer: false)
    focusTimerWindow.center()
    focusTimerWindow.setFrameAutosaveName("Focus Timer")
    focusTimerWindow.isReleasedWhenClosed = false
    focusTimerWindow.contentView = NSHostingView(rootView: FocusTimerView())
    focusTimerWindow.makeKeyAndOrderFront(nil)
    focusTimerWindow.level = .floating  // Makes the window always on top
  }

  func processOauthResponse(_ url: URL) {
    if url.absoluteString.contains("oauthsign") {
      guard let token = oauthCallbackValue(url, name: "token") else {
        Log.error(message: "OAuth response did not include a token")
        appStore.sendMessageToApp(message: [
          "oauth": oauthErrorPayload(url)
        ])
        return
      }
      let isSignup = oauthCallbackValue(url, name: "signup") == "true"
      let regionId = oauthCallbackValue(url, name: "regionId")
      appStore.sendMessageToApp(message: [
        "oauth": [
          "token": token,
          "signup": isSignup ? "true" : "false",
          "regionId": regionId ?? ""
        ]
      ])
    }
  }

  func handleCustomURL(_ url: URL) {
    Log.info("Url Scheme triggered: \(url.absoluteString)")
    if url.absoluteString.contains("oauthsignarchived") {
      let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
      guard let token = components?.queryItems?.first(where: { $0.name == "token" })?.value else {
        Log.error(message: "OAuth URL scheme did not include a token")
        return
      }
      let isSignup =
        components?.queryItems?.first(where: { $0.name == "signup" })?.value == "true"
      self.src.params = ["token": token, "signup": isSignup ? "true" : "false"]
      isShowOauthFlow = false
      self.src.viewModel.valuePublisher.send("authResult:success")
    } else if url.absoluteString.contains("debug") {
      self.src.params = ["debug": "true"]
    }
  }

  func oauthCallbackValue(_ url: URL, name: String) -> String? {
    let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
    if let value = components?.queryItems?.first(where: { $0.name == name })?.value {
      return value
    }
    guard let fragment = components?.fragment, !fragment.isEmpty else {
      return nil
    }
    let fragmentComponents = URLComponents(string: "authfn://callback?\(fragment)")
    return fragmentComponents?.queryItems?.first(where: { $0.name == name })?.value
  }

  func oauthErrorPayload(_ url: URL) -> [String: String] {
    return [
      "error": oauthCallbackValue(url, name: "auth_error") ?? "oauth_callback_failed",
      "errorCode": oauthCallbackValue(url, name: "auth_error_code") ?? "",
      "provider": oauthCallbackValue(url, name: "auth_provider") ?? "",
      "requestId": oauthCallbackValue(url, name: "auth_request_id") ?? ""
    ]
  }

  func onActive() {
    Log.info("App is active")
    // requestAudioPermission()
    self.src.viewModel.valuePublisher.send("appIsActive")
    isShowOauthFlow = false
    NotificationCenter.default.addObserver(forName: .didReceiveCustomURL, object: nil, queue: .main)
    { notification in
      if let url = notification.object as? URL {
        handleCustomURL(url)
      }
    }
  }

  private func requestAudioPermission() {
    switch AVCaptureDevice.authorizationStatus(for: .audio) {
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .audio) { granted in
        if granted {
          Log.info("Microphone permission granted")
        } else {
          DispatchQueue.main.async {
            showMicrophonePermissionAlert()
          }
        }
      }
    case .restricted, .denied:
      DispatchQueue.main.async {
        showMicrophonePermissionAlert()
      }
    case .authorized:
      Log.info("Microphone permission already granted")
    @unknown default:
      Log.info("Unknown microphone permission status")
    }
  }

  private func showMicrophonePermissionAlert() {
    let alert = NSAlert()
    alert.messageText = "Microphone Access Required"
    alert.informativeText =
      "This app needs access to your microphone. Please enable it in System Settings > Privacy & Security > Microphone"
    alert.alertStyle = .warning
    alert.addButton(withTitle: "Open System Settings")
    alert.addButton(withTitle: "Cancel")

    let response = alert.runModal()
    if response == .alertFirstButtonReturn {
      if let url = URL(
        string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")
      {
        NSWorkspace.shared.open(url)
      }
    }
  }

  func openOauthFlow(_ urlString: String) {
    if let url = URL(string: urlString) {
      appStore.oauthUrl = urlString
      self.isShowOauthFlow = true
    }
  }
}

struct FocusTimerView: View {
  @State private var remainingTime = 60  // Example: 60 seconds timer
  @State private var timerRunning = false

  let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

  var body: some View {
    Text("Remaining Time: \(remainingTime)")
      .onReceive(timer) { _ in
        if timerRunning && remainingTime > 0 {
          remainingTime -= 1
        }
      }
    Button("Start Timer") {
      timerRunning = true
    }
  }
}
extension Notification.Name {
  static let didReceiveCustomURL = Notification.Name("didReceiveCustomURL")
}

#Preview {
  BaseViewForMac()
}
