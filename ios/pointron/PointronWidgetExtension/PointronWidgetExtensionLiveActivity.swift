//
//  PointronWidgetExtensionLiveActivity.swift
//  PointronWidgetExtension
//
//  Created by Ar on 10/17/23.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct PointronWidgetExtensionAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct PointronWidgetExtensionLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PointronWidgetExtensionAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension PointronWidgetExtensionAttributes {
    fileprivate static var preview: PointronWidgetExtensionAttributes {
        PointronWidgetExtensionAttributes(name: "World")
    }
}

extension PointronWidgetExtensionAttributes.ContentState {
    fileprivate static var smiley: PointronWidgetExtensionAttributes.ContentState {
        PointronWidgetExtensionAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: PointronWidgetExtensionAttributes.ContentState {
         PointronWidgetExtensionAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: PointronWidgetExtensionAttributes.preview) {
   PointronWidgetExtensionLiveActivity()
} contentStates: {
    PointronWidgetExtensionAttributes.ContentState.smiley
    PointronWidgetExtensionAttributes.ContentState.starEyes
}
