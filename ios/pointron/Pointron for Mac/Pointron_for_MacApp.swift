//
//  Pointron_for_MacApp.swift
//  Pointron for Mac
//
//  Created by Ar on 3/6/24.
//
import Cocoa
import SwiftUI

@main
struct Pointron_for_MacApp: App {
  @NSApplicationDelegateAdaptor(MacAppDelegate.self) private var appDelegate: MacAppDelegate
  @StateObject var appStore = AppStore()
  var body: some Scene {
    WindowGroup {
      ContentView().environmentObject(appStore)
    }
    .handlesExternalEvents(matching: [])
  }
}
