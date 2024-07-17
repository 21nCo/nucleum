import type { ClipperExtensionEvent } from "./memotron/clip.type";
import type { PointronEvent } from "./pointron/pointronEvent.enum";

export type Event = GlobalEvent | PointronEvent | ClipperExtensionEvent;

export enum GlobalEvent {
  NONE = "NONE",
  SHOW_APPEARANCE_PREVIEW = "SHOW_APPEARANCE_PREVIEW",
  /**
   * @deprecated
   * Use svelte:window listener instead on the component
   */
  WINDOW_VISIBILITY_CHANGED = "WINDOW_VISIBILITY_CHANGED",
  /**
   * @deprecated
   * Use svelte:window listener instead on the component
   */
  WINDOW_CLICKED = "WINDOW_CLICKED",
  /**
   * @deprecated
   * Use svelte:window listener instead on the component
   */
  WINDOW_RESIZED = "WINDOW_RESIZED",
  USER_LOGIN = "USER_LOGIN",
  USER_SIGNUP = "USER_SIGNUP",
  /**
   * Bootstraps the user account - on singup - with seed data and necessary base data
   */
  BOOTSTRAP = "BOOTSTRAP",
  CUSTOM_NAVIGATION = "custom:navigation",
  CUSTOM_ALERT = "custom:alert"
}

export enum PlayActionState {
  NOT_STARTED = "NOT_STARTED",
  RUNNING = "RUNNING",
  PAUSED = "PAUSED",
  STOPPED = "STOPPED",
  PREVIEWING = "PREVIEWING",
  PAUSEPREVIEWING = "PAUSEPREVIEWING",
  RESUMEPREVIEWING = "RESUMEPREVIEWING"
}
