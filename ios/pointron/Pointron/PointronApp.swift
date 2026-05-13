//
//  PointronApp.swift
//  Pointron
//
//  Created by Ar on 10/9/23.
//

import SwiftUI
import UserNotifications

@main
struct PointronApp: App {
  init() {
    // Request permission for notifications
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) {
      success, error in
      if success {
        print("Notifications permission granted")
      } else if let error = error {
        print(error.localizedDescription)
      }
    }
  }
  var body: some Scene {
    WindowGroup {
      ContentView().environmentObject(AppStore())
    }
  }
}
