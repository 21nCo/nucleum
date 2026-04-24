//
//  ContentView.swift
//  Nucleum
//
//  Created by Ar on 2/8/24.
//

import SwiftUI

struct ContentView: View {
  @EnvironmentObject var appStore: AppStore
  @State private var showTranscriptionView = false
  @StateObject private var aiService = AIService.shared
  @State private var isShowTranscriptionDebugger = false

  var body: some View {
    ZStack {
      BaseView().environmentObject(appStore)
      if isShowTranscriptionDebugger {
        VStack {
          Spacer()

          HStack {
            Spacer()

            Button(action: {
              showTranscriptionView = true
            }) {
              Image(systemName: "waveform.circle.fill")
                .font(.system(size: 24))
                .padding()
                .background(Circle().fill(Color.blue))
                .foregroundColor(.white)
            }
            .padding(.trailing, 20)
            .padding(.bottom, 40)
            .sheet(isPresented: $showTranscriptionView) {
              AudioTranscriptionView()
            }
          }
        }
      }
    }
  }
}

#Preview {
  ContentView().environmentObject(AppStore())
}
