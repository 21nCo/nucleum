import { appEvents, windowObject } from "$lib/tidy/stores/app.store";
import { AppEvent } from "$lib/tidy/types/event.enum";

export function onOpenPreview() {
  appEvents.publish(AppEvent.SHOW_APPEARANCE_PREVIEW, true);
  windowObject.gotoPath("/");
}

export function onCloseAppearancePreview() {
  appEvents.publish(AppEvent.SHOW_APPEARANCE_PREVIEW, false);
}
