//
//  Modal.swift
//  Pointron
//
//  Created by Ar on 10/26/23.
//

import SwiftUI

struct SafariViewModal: View {
  @EnvironmentObject var appStore: AppStore
  var body: some View {
    ZStack {
      Color.white.opacity(0)
      VStack {
        if let url = URL(string: appStore.inAppSafariUrl), isAllowedExternalUrl(url) {
          SafariView(url: url)
        }
      }
      //   .background(appStore.bg)
    }
  }
}

#Preview {
  SafariViewModal()
    .environmentObject(AppStore.shared)
}
