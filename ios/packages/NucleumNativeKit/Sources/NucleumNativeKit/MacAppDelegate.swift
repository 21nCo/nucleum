import Cocoa
import SwiftUI

class MacAppDelegate: NSObject, NSApplicationDelegate {
  func applicationDidFinishLaunching(_ notification: Notification) {
    if let window = NSApplication.shared.windows.first {
      window.setFrame(NSScreen.main?.visibleFrame ?? NSRect.zero, display: true)
    }

    // Register for URL scheme notifications
    NSAppleEventManager.shared().setEventHandler(
      self,
      andSelector: #selector(handleURLEvent(_:withReplyEvent:)),
      forEventClass: AEEventClass(kInternetEventClass),
      andEventID: AEEventID(kAEGetURL)
    )
  }

  func application(_ application: NSApplication, open urls: [URL]) {
    guard let url = urls.first else { return }
    // Handle the custom URL
    print("URL received in application(_:open:): \(url)")
    handleURL(url)
  }

  @objc func handleURLEvent(
    _ event: NSAppleEventDescriptor, withReplyEvent replyEvent: NSAppleEventDescriptor
  ) {
    guard
      let urlString = event.paramDescriptor(forKeyword: AEKeyword(keyDirectObject))?.stringValue,
      let url = URL(string: urlString)
    else {
      return
    }

    print("URL received in handleURLEvent: \(url)")
    handleURL(url)
  }

  private func handleURL(_ url: URL) {
    DispatchQueue.main.async {
      print("Posting URL notification: \(url)")
      NotificationCenter.default.post(name: .didReceiveCustomURL, object: url)
    }
  }

  func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool
  {
    if !flag {
      // Reopen your main window or bring it to the front
      NSApp.windows.first?.makeKeyAndOrderFront(self)
    }
    return true
  }
}
