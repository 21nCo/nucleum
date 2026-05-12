//
//  Modal.swift
//  Pointron
//
//  Created by Ar on 10/26/23.
//

import SwiftUI

struct Modal: View {
  @EnvironmentObject var appStore: AppStore
  #if os(iOS)
    @State var popViewModel = WebViewModel()
  #endif
  @State private var refreshId = TimeUtils.getCurrentTimeInUTC()
  var body: some View {
    ZStack {
      Color.white.opacity(0)
      VStack {
        if appStore.popup.title != nil {
          HStack {
            SimpleText((appStore.popup.title ?? "").capitalized, fontSize: FontSize.sheetHeading)
              .padding()
            Spacer()
          }
        }
        #if os(iOS)
          WebViewTwo(
            urlType: .customProtocolUrl,
            refreshId: refreshId,
            url: URL(string: LocalConfig.webOrigin + "/" + appStore.popup.path)!,
            params: [
              "isSheet": "true", "spath": appStore.popup.path,
              "title": appStore.popup.title ?? "",
            ],
            isSheet: false,
            viewModel: popViewModel
          )
          .onReceive(self.popViewModel.messageFromSource.receive(on: RunLoop.main)) { value in
            appStore.incomingMessageHandler(value: value)
          }.onReceive(self.popViewModel.showLoader.receive(on: RunLoop.main)) { value in
            Log.info("showLoader for modal: \(value)")
            appStore.isShowLoadingOverlay = value
          }
          // .padding(.top, 40) - required if the webview has scrollable area - to have enough area for swiftUI gesture to work to close the sheet
          .padding()
        #endif
      }
      .background(appStore.bg)
      if appStore.isSheetMounted == false {
        LoadingOverlay(isSheet: true)
      }
    }
  }
}

#Preview {
  Modal()
}
