import { appEvents, windowObject } from "$lib/tidy/stores/app.store";
import { EventType } from "$lib/tidy/types/event.enum";

export function onOpenPreview() {
  appEvents.publish(EventType.SHOW_APPEARANCE_PREVIEW, true);
  windowObject.gotoPath("/");
}

export function onCloseAppearancePreview() {
  appEvents.publish(EventType.SHOW_APPEARANCE_PREVIEW, false);
}
