import SwiftUI

struct SimpleWidgetText: View {
  let content: String
  let color: Color
  init(_ content: String, color: Color) {
    self.content = content
    self.color = color
  }
  var body: some View {
    if #available(iOS 17.0, *) {
      Text(content).foregroundStyle(color)
    } else {
      Text(content)
        .foregroundColor(color)
    }
  }
}
