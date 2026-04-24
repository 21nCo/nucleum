//
//  Nucleum_for_MacApp.swift
//  Nucleum for Mac
//
//  Created by Ar on 3/9/24.
//
import Cocoa
import SwiftUI

@main
struct Nucleum_for_MacApp: App {
  @NSApplicationDelegateAdaptor(MacAppDelegate.self) private var appDelegate: MacAppDelegate

  init() {
    // Initialize the AI service on the shared AppStore instance
    AppStore.shared.setAIServiceProvider(AIService.shared)
  }

  var body: some Scene {
    WindowGroup {

      // DraggableWindowAdapter()
      // UsingDraggableArea()
      ContentView().environmentObject(AppStore.shared)
        // .toolbar {
        //   Button(action: {}) {
        //     Image(systemName: "arrow.triangle.turn.up.right.diamond")
        //     Text("Button 1")
        //   }
        // }
        .edgesIgnoringSafeArea(.top)
      //   .frame(minWidth: 800, maxWidth: .infinity, minHeight: 600, maxHeight: .infinity)
    }
    // .windowStyle(.hiddenTitleBar)
    .handlesExternalEvents(matching: [])
    // .windowStyle(HiddenTitleBarWindowStyle())
    // .windowToolbarStyle(UnifiedCompactWindowToolbarStyle())
    // .commands {
    //   CommandGroup(replacing: .windowList) {
    //     Button(action: {}) {
    //       Image(systemName: "minus")
    //     }
    //   }
    // }
    // .commands {
    //   CommandGroup(replacing: .windowArrangement) {}
    // }

  }
}

struct UsingDraggableArea: View {
  var body: some View {
    ZStack {
      ContentView().environmentObject(AppStore.shared)
      VStack {
        DraggableView()
          .frame(height: 20)
          .background(Color.red)
        Spacer()
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .edgesIgnoringSafeArea(.all)
  }
}

struct DraggableView: NSViewRepresentable {
  func makeNSView(context: Context) -> NSDraggableView {
    return NSDraggableView()
  }

  func updateNSView(_ nsView: NSDraggableView, context: Context) {
  }
}

class NSDraggableView: NSView {
  override var mouseDownCanMoveWindow: Bool {
    return true
  }
}

// class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
//   func applicationDidFinishLaunching(_ notification: Notification) {
//     if let window = NSApplication.shared.windows.first {
//       window.titleVisibility = .hidden
//       window.titlebarAppearsTransparent = true
//       window.backgroundColor = NSColor.clear
//       window.styleMask.insert(.fullSizeContentView)
//       // window.styleMask.remove(.titled)
//       // window.styleMask.remove(.closable)
//       // window.standardWindowButton(.zoomButton)?.isHidden = true
//       // window.standardWindowButton(.closeButton)?.isHidden = true
//       // window.standardWindowButton(.miniaturizeButton)?.isHidden = true
//       window.contentView = NSHostingView(
//         rootView: ContentView().environmentObject(AppStore()))
//       window.center()
//       window.setFrameAutosaveName("Main Window")
//       window.delegate = self
//     }
//   }
// }
class AppDelegateTwo: NSObject, NSApplicationDelegate, NSWindowDelegate {
  var window: DraggableWindow!
  var windowController: DraggableWindowController!

  func applicationDidFinishLaunching(_ notification: Notification) {
    window = DraggableWindow(
      contentRect: NSRect(x: 0, y: 0, width: 480, height: 300),
      styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
      backing: .buffered, defer: false)
    window.center()
    window.setFrameAutosaveName("Main Window")
    window.delegate = self

    windowController = DraggableWindowController(window: window)
    windowController.showWindow(nil)

    NSApp.activate(ignoringOtherApps: true)
  }
}
class DraggableWindow: NSWindow {
  override var canBecomeKey: Bool { true }
  override var canBecomeMain: Bool { true }
  override var acceptsFirstResponder: Bool { true }

  override func mouseDown(with event: NSEvent) {
    self.performDrag(with: event)
  }
}

class DraggableWindowController: NSWindowController {
  override func windowDidLoad() {
    super.windowDidLoad()
    if let window = window as? DraggableWindow {
      window.contentView = NSHostingView(rootView: ContentView().environmentObject(AppStore.shared))
    }
  }
}

struct DraggableWindowAdapter: NSViewRepresentable {
  func makeNSView(context: Context) -> NSView {
    let view = NSView()
    DispatchQueue.main.async {
      if let windowController = view.window?.windowController as? DraggableWindowController {
        windowController.windowDidLoad()
      }
    }
    return view
  }

  func updateNSView(_ nsView: NSView, context: Context) {}
}
