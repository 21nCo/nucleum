//
//  SimpleText.swift
//  Pointron
//
//  Created by Ar on 11/9/23.
//

import SwiftUI

struct SimpleText: View {
  @State var content: String
  @State var fontSize: CGFloat
  @State var color: Color?
  @EnvironmentObject var appStore: AppStore
  init(_ content: String, color: Color? = nil, fontSize: CGFloat = 16) {
    self.content = content
    self.color = color
    self.fontSize = fontSize
  }
  var body: some View {
    if #available(iOS 17.0, *) {
      Text(content)
        .font(.custom("Avenir", size: fontSize))
        .foregroundStyle(color ?? appStore.fg)
    } else {
      Text(content)
        .font(.custom("Avenir", size: fontSize))
        .foregroundColor(color ?? appStore.fg)
    }
  }
}

#Preview {
  SimpleText("Simple content")
}
