//
//  CurrentSessionWidget.swift
//  Pointron
//
//  Created by Ar on 10/17/23.
//

import Foundation
import SwiftUI
import WidgetKit

//let exampleEntry = CurrentSessionEntry(date: Date(), session: CurrentSession(isFocusRunning: true, goalName: "Goal #1", color: "hsl(205 69% 49%)", startTime: Date() - 240));
let exampleEntry = CurrentSessionEntry(
  date: Date(),
  session: CurrentSession(
    isSessionRunning: false, goalName: "Design Pointron widgets", color: "hsl(205 69% 49%)",
    start: Date() - 7100, end: Date() + 16000, todayFocus: 10, isFocusing: true))
//let exampleEntry = CurrentSessionEntry(date: Date(), session: CurrentSession(isSessionRunning: false, todayFocus: 10.2));
//let exampleEntry = CurrentSessionEntry(date: Date(), session: CurrentSession(isSessionRunning: false));

extension Color {
  static let gameBackgroundColor = Color(red: 0.988, green: 0.416, blue: 0.239, opacity: 1)
  static let gameWidgetBackground = Color(red: 0.913, green: 0.737, blue: 0.447, opacity: 1)
  static let liveActivityBackground = Color(red: 0.29, green: 0.42, blue: 0.60)
  static let appBackground = Color(red: 0.478, green: 0.808, blue: 1)
  static let textColor = Color.white
}

extension View {
  func widgetBackground(color: Color) -> some View {
    if #available(iOS 17.0, *) {
      return containerBackground(for: .widget) {
        color
      }
    } else {
      return background {
        color
      }
    }
  }
}

struct CurrentSessionTimelineProvider: TimelineProvider {
  public typealias Entry = CurrentSessionEntry
  func placeholder(in context: Context) -> CurrentSessionEntry {
    return CurrentSession.defaultEntry
  }
  func getSnapshot(in context: Context, completion: @escaping (CurrentSessionEntry) -> Void) {
    CurrentSession.refreshSessionInformation { (session, error) in
      guard let session = session else {
        completion(CurrentSession.defaultEntry)
        return
      }
      completion(CurrentSessionEntry(date: Date(), session: session, colors: resolveColors()))
    }
  }

  func getTimeline(
    in context: Context, completion: @escaping (Timeline<CurrentSessionEntry>) -> Void
  ) {
    CurrentSession.refreshSessionInformation { (session, error) in
      guard let session = session else {
        let entries = [CurrentSession.defaultEntry]
        let timeline = Timeline(entries: entries, policy: .after(Date().addingTimeInterval(5 * 60)))
        completion(timeline)
        return
      }
      let entry = CurrentSessionEntry(date: Date(), session: session, colors: resolveColors())
      let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(5 * 60)))
      completion(timeline)
    }
  }
}

struct CurrentSessionEntry: TimelineEntry {
  var date: Date
  var session: CurrentSession
  var colors: ColorSchemeColors?
}

struct ControlButtonsView: View {
  @Environment(\.widgetFamily) var family
  @State var color: Color
  var body: some View {
    HStack(spacing: 12) {
      Button(action: {
        // Your action here
      }) {
        VStack {
          Image(systemName: "clock.fill")
            .padding(family == .systemSmall ? 8 : 10)
            .font(.system(size: family == .systemSmall ? 12 : 20))
            .foregroundColor(Color.white)
            .background(
              Circle()
                .fill(color))
          if family != .systemSmall {
            SimpleWidgetText("break", color: color).font(.system(size: 12))
          }
        }
      }.buttonStyle(.plain)
      Button(action: {
        // Your action here
      }) {
        VStack {
          Image(systemName: "stop.fill")
            .padding(family == .systemSmall ? 8 : 10)
            .font(.system(size: family == .systemSmall ? 12 : 20))
            .foregroundColor(Color.white)
            .background(
              Circle()
                .fill(color))
          if family != .systemSmall {
            SimpleWidgetText("finish", color: color).font(.system(size: 12))
          }
        }
      }.buttonStyle(.plain)
    }
  }
}

struct TimerText: View {
  @Environment(\.widgetFamily) var family
  @State var startTime: Date
  @State var color: Color
  @State private var currentTime = Date()
  var body: some View {
    HStack {
      // Image(systemName: "bolt.fill")
      //   .font(.system(size: family == .systemSmall ? 16 : 20))

      if #available(iOS 17.0, *) {
        Text(startTime.addingTimeInterval(0), style: .timer)
          .multilineTextAlignment(.center)
          // .font(.system(size: family == .systemSmall ? 24 : 40, design: .monospaced))
          .font(.custom("Avenir-Heavy", size: family == .systemSmall ? 28 : 40))
          .fontWeight(.bold)
          .foregroundStyle(color)
      } else {
        Text(startTime.addingTimeInterval(0), style: .timer)
          .multilineTextAlignment(.center)
          .font(.system(size: family == .systemSmall ? 28 : 40))
          .foregroundColor(color)
      }
    }
  }
}

struct StartButton: View {
  @Environment(\.widgetFamily) var family
  @State var color: Color
  var body: some View {
    Button(action: {
      // Your action here
    }) {
      HStack {
        Image(systemName: "play.fill")
          .font(.system(size: resolveButtonSize()))
          .foregroundColor(color)
        if #available(iOS 17.0, *) {
          SimpleWidgetText(family == .accessoryCircular ? "start" : "start focus", color: color)
            .font(
              .system(size: resolveButtonSize()))
        } else {
          SimpleWidgetText("start focus", color: color).font(.system(size: resolveButtonSize()))
        }
      }
    }.buttonStyle(.plain)
      .padding(10)
      .cornerRadius(40)
      .overlay(
        RoundedRectangle(cornerRadius: 40)
          .stroke(color, lineWidth: 1)
      )
  }
  func resolveButtonSize() -> CGFloat {
    switch family {
    case .systemLarge, .systemMedium, .systemSmall:
      return 12
    case .accessoryCircular, .accessoryRectangular:
      return 12
    default:
      return 8
    }
  }
}

struct TimePart: View {
  @Environment(\.widgetFamily) var family
  var entry: CurrentSessionTimelineProvider.Entry
  var isStart: Bool
  @State var color: Color
  var body: some View {
    if isStart, let startTime = entry.session.start {
      VStack(alignment: .leading) {
        SimpleWidgetText("Start", color: color)
          .font(.system(size: 10))
        SimpleWidgetText(formatDateToTimeString(date: startTime), color: color)
          .font(.system(size: 12))
      }
    } else {
      VStack(alignment: .trailing) {
        if let endTime = entry.session.end {
          SimpleWidgetText("End", color: color)
            .font(.system(size: 10))
          SimpleWidgetText(formatDateToTimeString(date: endTime), color: color)
            .font(.system(size: 12))
        } else {
          SimpleWidgetText("Now", color: color).font(.system(size: 12))
        }
      }
    }
  }
  func formatDateToTimeString(date: Date) -> String {
    let format = DateFormatter()
    format.dateFormat = "HH:mm"
    return format.string(from: date)
  }
}

struct CustomProgressViewStyle: ProgressViewStyle {
  var color: Color

  func makeBody(configuration: Configuration) -> some View {
    GeometryReader { geometry in
      ZStack(alignment: .leading) {
        RoundedRectangle(cornerRadius: 2)
          .fill(color.opacity(0.3))

        RoundedRectangle(cornerRadius: 2)
          .fill(color)
          .frame(width: CGFloat(configuration.fractionCompleted ?? 0) * geometry.size.width)
      }
    }
  }
}

struct TodayFocusText: View {
  @Environment(\.widgetFamily) var family
  @State var color: Color
  @State var todayFocus: Float
  var body: some View {
    VStack(alignment: .leading) {
      SimpleWidgetText("Today", color: color).font(
        family == .systemSmall ? .caption : .body)
      if #available(iOS 16.0, *) {
        SimpleWidgetText(
          "\(String(format: "%.2f", todayFocus)) hr", color: color
        )
        .bold()
      } else {
        SimpleWidgetText(
          "\(String(format: "%.2f", todayFocus)) hr", color: color)
      }
    }
  }
}

struct CurrentSessionView: View {
  @Environment(\.widgetFamily) var family
  var entry: CurrentSessionTimelineProvider.Entry
  @State var secondsPassed = 0
  var body: some View {
    VStack {
      if entry.session.isSessionRunning, let startTime = entry.session.start {
        switch family {
        case .systemSmall, .systemMedium:
          // Temp - using spacing as Spacer() is not working in .systemSmall widget
          VStack(spacing: 10) {
            HStack(spacing: family == .systemSmall ? 1 : 2) {
              TimePart(entry: entry, isStart: true, color: resolveColor(.fg))
              if let endTime = entry.session.end {
                ProgressView(value: progress(start: startTime, end: endTime))
                  .progressViewStyle(CustomProgressViewStyle(color: resolveColor(.accent)))
                  .frame(height: 4)
                  .padding(.horizontal, 10)
              } else {
                if #available(iOS 17.0, *) {
                  RoundedRectangle(cornerRadius: 2)
                    .padding(.horizontal, 10)
                    .frame(height: 4)
                    .foregroundStyle(resolveColor(.accent))
                } else {
                  RoundedRectangle(cornerRadius: 2)
                    .padding(.horizontal, 10)
                    .frame(height: 4)
                    .foregroundColor(resolveColor(.accent))
                    .opacity(0.5)
                }
              }
              TimePart(entry: entry, isStart: false, color: resolveColor(.fg))
            }
            Spacer()
            VStack {
              SimpleWidgetText(
                resolveGoalLabelText(),
                color: resolveColor(entry.session.isFocusing ? .accent : .fg)
              )
              .font(.system(size: family == .systemSmall ? 12 : 16))
              .truncationMode(.tail)
              .lineLimit(1)
              if family == .systemSmall {
                TimerText(startTime: startTime, color: resolveColor(.fg))
                Spacer()
                // ControlButtonsView(color: resolveColor())
              } else {
                HStack {
                  TimerText(startTime: startTime, color: resolveColor(.fg))
                  Spacer()
                  // ControlButtonsView(color: resolveColor())
                }
              }
            }
          }  //.background(resolveColor(.bg))
          .frame(maxHeight: .infinity)
          .widgetBackground(color: resolveColor(.bg))

        case .accessoryInline:
          HStack {
            Image(systemName: "bolt.fill")
              .font(.system(size: 12))
            Text(startTime.addingTimeInterval(0), style: .timer)
          }
        case .accessoryRectangular:
          HStack {
            Image(systemName: "bolt.fill")
              .font(.system(size: 20))
            VStack(alignment: .leading) {
              Text(resolveGoalLabelText())
                .font(.system(size: 12))
                .truncationMode(.tail)
                .lineLimit(1)
              Text(startTime.addingTimeInterval(0), style: .timer)
                .font(.system(size: 32))
            }
          }
        case .accessoryCircular:
          VStack(alignment: .leading) {
            Text(resolveGoalLabelText())
              .font(.system(size: 12))
              .truncationMode(.tail)
              .lineLimit(1)
            Text(startTime.addingTimeInterval(0), style: .timer)
              .font(.system(size: checkIfDurationIsInHours(start: startTime) ? 14 : 20))
          }
        default:
          VStack {
            Text(resolveGoalLabelText())
              .font(.system(size: 12))
              .truncationMode(.tail)
              .lineLimit(1)
            HStack {
              Image(systemName: "bolt.fill")
                .font(.system(size: 12))
              Text(startTime.addingTimeInterval(0), style: .timer)
            }
          }
        }
      } else {
        switch family {
        case .systemSmall, .systemMedium:
          HStack {
            if let todayFocus = entry.session.todayFocus {
              if family == .systemMedium {
                HStack(alignment: .center) {
                  TodayFocusText(color: resolveColor(.fg), todayFocus: todayFocus)
                  Spacer()
                  StartButton(color: resolveColor())
                }
              } else {
                VStack(alignment: .leading) {
                  TodayFocusText(color: resolveColor(.fg), todayFocus: todayFocus)
                  Spacer()
                  StartButton(color: resolveColor())
                }
              }
            } else {
              SimpleWidgetText("Pointron", color: resolveColor(.fg))
            }
          }.widgetBackground(color: resolveColor(.bg))
        case .accessoryCircular, .accessoryRectangular:
          if #available(iOS 16.0, *) {
            VStack {
              if let todayFocus = entry.session.todayFocus {
                VStack {
                  Text(family == .accessoryCircular ? "Focus" : "Today").font(
                    family == .systemSmall ? .caption : .body)
                  Text("\(String(format: "%.1f", todayFocus)) hr")
                    .bold()
                    .font(.system(size: family == .accessoryCircular ? 15 : 20))
                }
              } else {
                VStack {
                  Text(family == .accessoryCircular ? "Focus" : "Pointron")
                  StartButton(color: resolveColor())
                }
              }
            }
          }
        default:
          VStack {

          }

        }
      }
    }.frame(maxHeight: .infinity)
  }
  func resolveGoalLabelText() -> String {
    return entry.session.isFocusing ? entry.session.goalName ?? "" : "Break"
  }
  func checkIfDurationIsInHours(start: Date) -> Bool {
    let currentDate = Date()
    let components = Calendar.current.dateComponents(
      [.hour, .minute], from: start, to: currentDate)
    guard let hour = components.hour, let minute = components.minute else {
      return false
    }
    let durationInHours = Double(hour) + Double(minute) / 60.0
    return durationInHours > 1
  }
  func resolveColor(_ type: ColorType = .accent) -> Color {
    switch type {
    case .accent:
      return Color.hsl(entry.session.color ?? entry.colors?.aps1 ?? defaultScheme.colors.aps1)
    case .bg:
      return Color.hsl(entry.colors?.bgs1 ?? defaultScheme.colors.bgs1)
    case .fg:
      return Color.hsl(entry.colors?.fgs1 ?? defaultScheme.colors.fgs1)
    }
  }
  func elapsed(startTime: Date) {

  }
  func progress(start: Date, end: Date) -> Double {
    let now = Date()
    let total = end.timeIntervalSince(start)
    let elapsed = now.timeIntervalSince(start)
    return min(max(elapsed / total, 0), 1)
  }
}

struct CurrentSessionWidget: Widget {

  public var body: some WidgetConfiguration {
    StaticConfiguration(
      kind: LocalConfig.currentSessionWidget.kind, provider: CurrentSessionTimelineProvider()
    ) { entry in
      CurrentSessionView(entry: entry)
    }
    .configurationDisplayName(LocalConfig.currentSessionWidget.name)
    .description(LocalConfig.currentSessionWidget.description)
    .supportedFamilies(resolveSupportedFamilies())
  }
}

@available(iOS 17, *) #Preview("Home - small", as: .systemSmall) {
  CurrentSessionWidget()
} timeline: {
  exampleEntry
}

@available(iOS 17, *) #Preview("Home - medium", as: .systemMedium) {
  CurrentSessionWidget()
} timeline: {
  exampleEntry
}

@available(iOS 17, *) #Preview("Lock screen - Inline", as: .accessoryInline) {
  CurrentSessionWidget()
} timeline: {
  exampleEntry
}
@available(iOS 17, *) #Preview("Lock screen - Rect", as: .accessoryRectangular) {
  CurrentSessionWidget()
} timeline: {
  exampleEntry
}
@available(iOS 17, *) #Preview("Lock screen - Circ", as: .accessoryCircular) {
  CurrentSessionWidget()
} timeline: {
  exampleEntry
}
