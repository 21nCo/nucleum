import { goto } from "$app/navigation";
import { appEvents } from "$lib/tidy/stores/app.store";
import { EventType } from "$lib/tidy/types/event.enum";

export function onOpenPreview() {
  appEvents.publish(EventType.SHOW_APPEARANCE_PREVIEW, true);
  goto("/");
}

export function onCloseAppearancePreview() {
  appEvents.publish(EventType.SHOW_APPEARANCE_PREVIEW, false);
}

export function notFoundAction() {
  goto("/point");
}
