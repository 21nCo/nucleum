//
//  ContentView.swift
//  Pointron
//
//  Created by Ar on 10/9/23.
//
import SwiftUI

struct ContentView: View {
  @EnvironmentObject var appStore: AppStore
  var body: some View {
    BaseView().environmentObject(appStore)
  }
}

#Preview {
  ContentView().environmentObject(AppStore())
}
