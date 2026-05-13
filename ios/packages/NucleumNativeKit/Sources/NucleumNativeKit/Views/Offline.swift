//
//  Offline.swift
//  Pointron
//
//  Created by Ar on 10/26/23.
//

import SwiftUI

struct Offline: View {
    @EnvironmentObject var appStore: AppStore
    var body: some View {
        VStack(alignment:.center){
            SimpleText("Looks like you are offline.").font(.title2)
            SimpleText("Please connect to the internet and try again.")

        }.padding(20)
    }
}

#Preview {
    Offline()
      .environmentObject(AppStore.shared)
}
