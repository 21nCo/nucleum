//
//  ContentView.swift
//  Memotron for Mac
//
//  Created by Ar on 3/9/24.
//

import SwiftUI

struct ContentView: View {
  @EnvironmentObject var appStore: AppStore
  var body: some View {
    MacContent().environmentObject(appStore)
  }
}

#Preview {
  ContentView().environmentObject(AppStore())
}
