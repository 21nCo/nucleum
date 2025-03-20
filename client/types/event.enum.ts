import type { ClipperExtensionEvent } from "../products/memotron/common/clip.type";
import type { PointronEvent } from "./pointron/pointronEvent.enum";
import type { MemotronEvent } from "../products/memotron/memotron.type";
export type Event =
  | GlobalEvent
  | PointronEvent
  | ClipperExtensionEvent
  | MemotronEvent;

export enum GlobalEvent {
  NONE = "NONE",
  SHOW_APPEARANCE_PREVIEW = "SHOW_APPEARANCE_PREVIEW",
  /**
   * @deprecated - using flux.terminate and flux.init to load or invalidate stores.
   */
  USER_LOGIN = "USER_LOGIN",
  /**
   * @deprecated - using flux.terminate and flux.init to load or invalidate stores.
   */
  USER_SIGNUP = "USER_SIGNUP",
  /**
   *
   * @deprecated - using flux.terminate and flux.init to load or invalidate stores.
   *
   * Bootstraps the user account - on singup - with seed data and necessary base data
   */
  BOOTSTRAP = "BOOTSTRAP",
  CUSTOM_NAVIGATION = "custom:navigation",
  PERSIST_APPEARANCE_USER = "PERSIST_APPEARANCE_USER",
  CUSTOM_ALERT = "custom:alert",
  ACTIVATE_SEARCH_BOX = "ACTIVATE_SEARCH_BOX",
  ENTER = "Enter",
  ESCAPE = "Escape",
  HIDE_POPOVER = "hidePopover",
  SYNC_DOWN = "syncDown",
  APP_MENU_SWITCHED = "APP_MENU_SWITCHED",
  MUTATION = "mutation",
  FOCUS_MODE = "focusMode",
  APP_LOADING_STATUS = "appLoadingStatus",
  /**
   * Listened to in ResourceResolver - to reload entire loaded resource
   */
  RELOAD_RESOURCE = "reloadResource",
  SEARCH_RESULT_KEYUP = "searchresultkeyup",
  SEARCH_RESULT_KEYDOWN = "searchresultkeydown",
  ADD_TO_RECENTS = "addToRecents"
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
