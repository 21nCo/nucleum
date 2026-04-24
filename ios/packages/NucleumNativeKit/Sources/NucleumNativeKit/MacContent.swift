//
//  MacContent.swift
//  Pointron for Mac
//
//  Created by Ar on 3/6/24.
//

import SwiftUI

struct MacContent: View {
  @EnvironmentObject var appStore: AppStore
  var body: some View {
    BaseViewForMac().environmentObject(appStore)
  }
}

#Preview {
  MacContent().environmentObject(AppStore())
}
