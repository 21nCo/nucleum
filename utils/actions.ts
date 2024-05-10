/**
 * @deprecated
 */
import { appEvents } from "$lib/tidy/stores/notification.store";
import view from "$lib/tidy/stores/view.store";
import { AppEvent } from "$lib/tidy/types/event.enum";

export function onOpenPreview() {
  appEvents.publish(AppEvent.SHOW_APPEARANCE_PREVIEW, true);
  view.gotoPath("/");
}

export function onCloseAppearancePreview() {
  appEvents.publish(AppEvent.SHOW_APPEARANCE_PREVIEW, false);
}
