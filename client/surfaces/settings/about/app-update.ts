import { navigation } from "@nucleum/shell/navigation/navigation";
import { get } from "svelte/store";

import { appStore } from "@nucleum/shared-state/app-context/app.store";

import context from "@nucleum/client/runtime/context.store";
import {
  confirmationNotification,
  toasts
} from "@nucleum/shared-state/notifications/notification.store";

import { AlertType } from "@nucleum/shared-state/notifications/notification.type";

import { logger } from "@nucleum/client/runtime/logging/logger";

import { OperatingSystem } from "@nucleum/client/runtime/context.type";

import { compareVersions } from "./compare-versions";

import { refreshAppStaticData } from "@nucleum/shared-state/app-context/app-data";
/** Checks product availability and presents the existing update action. */
export async function performAppUpdateCheck() {
  const versionOnClient = get(appStore).version;
  await refreshAppStaticData();
  const latestVersion = resolveLatestVersion();
  if (!latestVersion || !versionOnClient) return;
  const comparer = compareVersions(latestVersion, versionOnClient);
  if (comparer > 0) {
    if (get(context).isEmbed) {
      confirmationNotification.notify({
        title: `App update available (v${latestVersion}) 🎉`,
        message: "Please update the app to continue.",
        type: AlertType.INFO,
        confirmAction: {
          label: "Update",
          callback: async () => {
            if (
              get(context).os === OperatingSystem.IOS ||
              get(context).os === OperatingSystem.MACOS
            ) {
              return navigation.openLink(
                get(appStore).appData?.urls?.appStore ??
                  get(appStore).appData?.urls?.docs ??
                  ""
              );
            } else if (get(context).os === OperatingSystem.WINDOWS) {
              return navigation.openLink(
                get(appStore).appData?.urls?.microsoftStore ?? ""
              );
            } else if (get(context).os === OperatingSystem.ANDROID) {
              return navigation.openLink(
                get(appStore).appData?.urls?.playStore ?? ""
              );
            }
          }
        }
      });
    } else {
      toasts.trigger({
        id: "appUpdateAvailable",
        title: `App update available (v${latestVersion}) 🎉`,
        type: AlertType.INFO,
        actionText: "Reload",
        callback: () => {
          window.location.reload();
        }
      });
    }
  }
  logger.log({
    at: "performAppUpdateCheck",
    versionOnClient,
    latestVersion,
    comparer
  });

  function resolveLatestVersion() {
    const availability = get(appStore).appData?.availability;
    if (!availability) return;
    const ctx = !get(context).isEmbed ? "web" : get(context).os?.toLowerCase();
    const updated = availability[ctx];
    if (!updated) return;
    return updated;
  }
}
