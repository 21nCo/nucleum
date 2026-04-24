//
//  BaseView.swift
//  Memotron
//
//  Created by Ar on 2/8/24.
//

import Network
import SwiftUI
import WidgetKit

struct BaseView: View {
  @Environment(\.scenePhase) var scenePhase
  @EnvironmentObject var appStore: AppStore
  @State var webView = WebViewModel()
  let monitor = NWPathMonitor()
  @State var isOffline = false
  @State private var refreshId = TimeUtils.getCurrentTimeInUTC()
  @State var message = ""
  @StateObject var webViewModel = WebViewModel()
  @State var isShowInAppSafari = false
  @State var isShowOauthFlow = false
  @State var appUrl: URL = URL(string: LocalConfig.appUrl)!
  @State private var src: WebViewTwo = WebViewTwo(
    urlType: .customProtocolUrl,
    // urlType: .publicUrl,
    refreshId: TimeUtils.getCurrentTimeInUTC(),
    url: URL(string: LocalConfig.appUrl)!,
    // params: ["debug": "true"],
    params: [:],
    isSheet: false,
    viewModel: WebViewModel(),
    hideKeyboardToolbar: false
  )
  var body: some View {
    ZStack {
      appStore.bg.edgesIgnoringSafeArea(.top)
      if appStore.isShowModalOverlay {
        Color.black.opacity(0.6).edgesIgnoringSafeArea(.all)
      }
      VStack {
        self.src
      }.onReceive(self.src.viewModel.showLoader.receive(on: RunLoop.main)) { value in
        Log.info("showLoader event from webView: \(value)")
        //   appStore.isShowLoadingOverlay = value
      }.onReceive(self.src.viewModel.messageFromSource.receive(on: RunLoop.main)) { value in
        localMessageHandler(value: value)
      }.onReceive(self.src.viewModel.reloadEvent.receive(on: RunLoop.main)) { value in
        Log.info("Reloaded event from webView: \(value)")
        if value {
          onWebviewReload()
        }
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
            if let callbackURL = callbackURL {
              print("Success: \(callbackURL)")
              processOauthResponse(callbackURL)
            } else if let error = error {
              print("Error: \(error.localizedDescription)")
            }
            isShowOauthFlow = false
          }
        }
      }
    }
    .edgesIgnoringSafeArea(.all)
    .onAppear(perform: onActive)
    .onOpenURL { url in
      processUrlScheme(url)
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
        appStore.refreshAllWidgets()
      @unknown default:
        Log.info("Unknown scenePhase")
      }
    }
    .sheet(
      isPresented: $appStore.isShowSheet
    ) {
      Modal()
    }
    .sheet(
      isPresented: $appStore.isShowCamera,
      content: {
        CameraView()
      }
    )
    .sheet(isPresented: $isShowInAppSafari) {
      SafariViewModal()
    }
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
        Log.info("Setting sessionDataString: \(sessionDataString)")
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
    } else if value.keys.contains("reload") {
      Log.info("reload event")
      appStore.incomingMessageWrapper(value: value)
    } else {
      appStore.incomingMessageHandler(value: value)
    }
  }
  func openURLInSafari(_ urlString: String) {
    if let url = URL(string: urlString) {
      appStore.inAppSafariUrl = urlString
      // UIApplication.shared.open(url)
      self.isShowInAppSafari = true
    }
  }
  func openOauthFlow(_ urlString: String) {
    if let url = URL(string: urlString) {
      appStore.oauthUrl = urlString
      // UIApplication.shared.open(url)
      self.isShowOauthFlow = true
    }
  }

  func processOauthResponse(_ url: URL) {
    if url.absoluteString.contains("oauthsign") {
      // Get the part of the URL string before any # character
      let urlString = url.absoluteString.split(separator: "#")[0]

      // Split by = to get the token
      let token = urlString.split(separator: "=")[1]
      let isSignup = url.absoluteString.contains("signup")
      appStore.sendMessageToApp(message: [
        "oauth": ["token": String(token), "signup": isSignup ? "true" : "false"]
      ])
    }
  }

  func processUrlScheme(_ url: URL) {
    Log.info("Url Scheme triggered: \(url.absoluteString)")
    if url.absoluteString.contains("oauthsignarchived") {
      let token = url.absoluteString.split(separator: "=")[1]
      let isSignup = url.absoluteString.contains("signup")
      // self.appUrl = URL(string: "\(LocalConfig.appUrl)/?token=\(token)&signup=\(isSignup)")!
      self.src.params = ["token": String(token), "signup": isSignup ? "true" : "false"]
      self.isShowInAppSafari = false
      self.isShowOauthFlow = false
    } else if url.absoluteString.contains("debug") {
      self.src.params = ["debug": "true"]
    }
  }

  func onWebviewReload() {
    Log.info("WebView reloaded - BaseView")
    appStore.isAppMounted = false
  }
  func onActive() {
    self.src.viewModel.valuePublisher.send("appIsActive")
    var isLowSpeedInternet = false
    appStore.refreshAllWidgets()
    appStore.refreshSpecificWidget(id: LocalConfig.currentSessionWidget.kind)
    monitor.cancel()
    monitor.pathUpdateHandler = { path in
      let context = LogContext(
        file: #file, function: #function, line: #line, isSaveToServer: false)
      if path.status == .satisfied {
        Log.info("Connected to Internet", context: context)
        isOffline = false
      } else {
        Log.info("No connection.", context: context)
        isOffline = true
      }
      Log.info("path.isExpensive: \(path.isExpensive)", context: context)
      //considering mobile data as low speed for time being.
      isLowSpeedInternet = path.isExpensive
    }
    let queue = DispatchQueue(label: "Monitor")
    monitor.start(queue: queue)
    DispatchQueue.main.asyncAfter(deadline: .now() + .seconds(3)) {
      appStore.isShowLoadingOverlay = false
      // self.src.params = ["debug": "true"]
    }
  }
}

#Preview {
  BaseView()
}
