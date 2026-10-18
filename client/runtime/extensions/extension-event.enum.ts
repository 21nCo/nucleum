/** Events exchanged between the extension background, side panel, and content scripts. */
export enum ExtensionEvent {
  TAB_CHANGE = "TAB_CHANGE",
  TAB_UPDATE = "TAB_UPDATE",
  CLICK_FROM_SIDEPANEL = "CLICK_FROM_SIDEPANEL",
  TOGGLE_SIDEPANEL = "TOGGLE_SIDEPANEL",
  PAGE_STATE = "PAGE_STATE",
  PAGE_STATE_TRIGGER = "PAGE_STATE_TRIGGER",
  UPLOAD_TO_S3_USING_UPLOAD_URL = "UPLOAD_TO_S3_USING_UPLOAD_URL",
  FLUX_DELEGATION = "flux",
  LOGIN = "login",
  LOGOUT = "logout",
  TOKEN_NOT_FOUND = "token_not_found",
  UPLOAD_FILE = "upload",
  RUN = "run",
  BOOTUP = "bootup",
  MUTATION = "mutation",
  API_CALL = "api_call",
  SIDEPANEL_OPENED = "sidepanel_opened",
  SIDEPANEL_CLOSED = "sidepanel_closed"
}
