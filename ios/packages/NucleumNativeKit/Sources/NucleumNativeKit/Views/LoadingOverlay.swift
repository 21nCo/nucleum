//
//  LoadingOverlay.swift
//  Pointron
//
//  Created by Ar on 10/26/23.
//

import SwiftUI

#if os(iOS)
  import UIKit
#elseif os(macOS)
  import AppKit
#endif

struct LoadingOverlay: View {
  @EnvironmentObject var appStore: AppStore
  @State var isSheet: Bool = false
  var body: some View {
    ZStack {
      appStore.bg.edgesIgnoringSafeArea(.all)
      VStack(alignment: .center) {
        #if os(iOS)
          if let appIcon = UIImage(named: "AppIcon") ?? getAppIcon() {
            Image(uiImage: appIcon)
              .resizable()
              .scaledToFit()
              .frame(width: 64, height: 64)
              .cornerRadius(20)
          } else {
            SimpleText(isSheet ? "loading..." : appStore.appData.name)
          }
        #elseif os(macOS)
          if let appIcon = NSImage(named: "AppIcon") ?? NSImage(named: NSImage.applicationIconName)
          {
            Image(nsImage: appIcon)
              .resizable()
              .scaledToFit()
              .frame(width: 64, height: 64)
              .cornerRadius(20)
          } else {
            Text(isSheet ? "loading..." : appStore.appData.name)
          }
        #endif
      }
      // if !isSheet {
      //   ProgressView("")
      //     .progressViewStyle(CircularProgressViewStyle(tint: appStore.fg))
      //     .foregroundColor(.black)
      // }
    }
  }

  #if os(iOS)
    private func getAppIcon() -> UIImage? {
      if let icons = Bundle.main.infoDictionary?["CFBundleIcons"] as? [String: Any],
        let primaryIcon = icons["CFBundlePrimaryIcon"] as? [String: Any],
        let iconFiles = primaryIcon["CFBundleIconFiles"] as? [String],
        let lastIcon = iconFiles.last
      {
        return UIImage(named: lastIcon)
      }
      return nil
    }
  #endif
}

#Preview {
  LoadingOverlay().environmentObject(AppStore())
}
