const scheduledNotificationTimers = new Map();

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const message = event.data;
  if (!message || typeof message !== "object") return;

  if (message.type === "CLEAR_NOTIFICATIONS") {
    clearScheduledNotifications();
    return;
  }

  if (message.type === "SCHEDULE_NOTIFICATIONS") {
    clearScheduledNotifications();
    const notifications = Array.isArray(message.notifications)
      ? message.notifications
      : [];
    for (const notification of notifications) {
      scheduleNotification(notification);
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(focusOrOpenClient());
});

function scheduleNotification(notification) {
  if (!notification || !notification.id || !notification.message) return;

  const delayMs = Math.max(
    0,
    typeof notification.timestamp === "number"
      ? notification.timestamp - Date.now()
      : Number(notification.inSeconds ?? 0) * 1000
  );

  const timer = setTimeout(() => {
    scheduledNotificationTimers.delete(notification.id);
    self.registration.showNotification(notification.title ?? "21n", {
      body: notification.message,
      tag: notification.id,
      renotify: true,
      data: {
        id: notification.id
      }
    });
  }, delayMs);

  scheduledNotificationTimers.set(notification.id, timer);
}

function clearScheduledNotifications() {
  for (const timer of scheduledNotificationTimers.values()) {
    clearTimeout(timer);
  }
  scheduledNotificationTimers.clear();

  self.registration.getNotifications().then((notifications) => {
    for (const notification of notifications) {
      notification.close();
    }
  });
}

async function focusOrOpenClient() {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true
  });
  const client = clients[0];
  if (client) {
    return client.focus();
  }
  return self.clients.openWindow("/");
}
