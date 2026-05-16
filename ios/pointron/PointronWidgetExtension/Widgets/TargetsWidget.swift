//
//  TargetsWidget.swift
//  PointronWidgetExtensionExtension
//
//  Created by Ar on 10/26/23.
//

import Foundation
import WidgetKit
import SwiftUI

struct TargetsWidgetTimelineProvider: TimelineProvider {
    public typealias Entry = TargetsWidgetEntry
    func placeholder(in context: Context) -> TargetsWidgetEntry {
        return TargetWidgetModel.defaultEntry;
    }
    func getSnapshot(in context: Context, completion: @escaping (TargetsWidgetEntry) -> Void) {
        TargetWidgetModel.refresh() { (result, error) in
            guard let targets = result else {
                completion(TargetWidgetModel.defaultEntry)
                return
            }
            completion(TargetsWidgetEntry(date: Date(), targets: targets, colors: resolveColors()));
        }
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<TargetsWidgetEntry>) -> Void) {
        TargetWidgetModel.refresh() { (result, error) in
            guard let targets = result else {
                let entries = [TargetWidgetModel.defaultEntry];
                let timeline = Timeline(entries: entries, policy: .after(Date().addingTimeInterval(5 * 60)))
                completion(timeline)
                return
            }
            let entry = TargetsWidgetEntry(date: Date(), targets: targets, colors: resolveColors())
            let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(5 * 60)))
            completion(timeline)
        }
    }
}

struct TargetsWidgetEntry: TimelineEntry {
    var date: Date
    var targets: TargetWidgetModel
    var colors: ColorSchemeColors?;
}

struct TargetUnitView: View {
    @Environment(\.widgetFamily) var family;
    @State var startTime: Date
    @State var color: Color
    var body: some View {
        HStack{
            if #available(iOS 17.0, *) {
                Text(startTime.addingTimeInterval(0), style: .timer)
                    .multilineTextAlignment(.center)
                    .font(.system(size: family == .systemSmall ? 30 : 50))
                    .foregroundStyle(color)
            } else {
                Text(startTime.addingTimeInterval(0), style: .timer)
                    .multilineTextAlignment(.center)
                    .font(.system(size: family == .systemSmall ? 30 : 50))
                    .foregroundColor(color)
            }
        }
    }
}

struct TargetWidgetView: View {
    @Environment(\.widgetFamily) var family;
    var entry: TargetsWidgetTimelineProvider.Entry
    var body: some View {
        if(entry.targets.targets.count > 0){
            VStack{
                List(entry.targets.targets) { item in
                    HStack{
                        Text(item.scale)
                        Text("\(item.actual) / \(item.target)")
                    }
                }
            }
        } else {
            SimpleWidgetText("Targets data not available", color: resolveDefaultColor(.fg))
        }

    }
}

struct TargetsWidget: Widget {
    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: LocalConfig.targetsWidgets.kind, provider: TargetsWidgetTimelineProvider()){entry in
            TargetWidgetView(entry: entry)
        }
        .configurationDisplayName(LocalConfig.targetsWidgets.name)
        .description(LocalConfig.targetsWidgets.description)
        .supportedFamilies(resolveSupportedFamilies())
    }
}


//#Preview("Home - small",as: .systemSmall) {
//    TargetsWidget()
//} timeline: {
//    TargetWidgetModel.defaultEntry
//}
//
//#Preview("Home - medium",as: .systemMedium) {
//    TargetsWidget()
//} timeline: {
//    TargetWidgetModel.defaultEntry
//}
