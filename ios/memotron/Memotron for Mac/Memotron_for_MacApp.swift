//
//  Memotron_for_MacApp.swift
//  Memotron for Mac
//
//  Created by Ar on 3/9/24.
//
import Cocoa
import SwiftUI

@main
struct Memotron_for_MacApp: App {
  @NSApplicationDelegateAdaptor(MacAppDelegate.self) private var appDelegate: MacAppDelegate

  init() {
    DispatchQueue.global(qos: .utility).async {
      let aiService = AIService.shared
      DispatchQueue.main.async {
        AppStore.shared.setAIServiceProvider(aiService)
      }
    }
  }

  var body: some Scene {
    WindowGroup {

      // DraggableWindowAdapter()
      // UsingDraggableArea()
      ContentView().environmentObject(AppStore.shared)
        // .toolbar {
        //   Button(action: {}) {
        //     Image(systemName: "arrow.triangle.turn.up.right.diamond")
        //     Text("Button 1")
        //   }
        // }
        .edgesIgnoringSafeArea(.top)
      //   .frame(minWidth: 800, maxWidth: .infinity, minHeight: 600, maxHeight: .infinity)
    }
    // .windowStyle(.hiddenTitleBar)
    .handlesExternalEvents(matching: [])
    // .windowStyle(HiddenTitleBarWindowStyle())
    // .windowToolbarStyle(UnifiedCompactWindowToolbarStyle())
    // .commands {
    //   CommandGroup(replacing: .windowList) {
    //     Button(action: {}) {
    //       Image(systemName: "minus")
    //     }
    //   }
    // }
    // .commands {
    //   CommandGroup(replacing: .windowArrangement) {}
    // }

  }
}
