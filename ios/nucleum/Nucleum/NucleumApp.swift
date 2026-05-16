//
//  NucleumApp.swift
//  Nucleum
//
//  Created by Ar on 2/8/24.
//

import AVFoundation
import SwiftUI

@main
struct NucleumApp: App {

  init() {
    // configureAudioSession()
    // Initialize the AI service on the shared AppStore instance
    AppStore.shared.setAIServiceProvider(AIService.shared)
  }

  var body: some Scene {
    WindowGroup {
      ContentView().environmentObject(AppStore.shared)
    }
  }

  // private func configureAudioSession() {
  //   do {
  //     try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
  //     try AVAudioSession.sharedInstance().setActive(true)
  //   } catch {
  //     print("Failed to set audio session category. Error: \(error)")
  //   }
  // }
}
