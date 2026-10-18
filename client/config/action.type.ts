export enum ActionType {
  PAGE = "PAGE",
  /**
   * Link action will open a link in a new tab if the context is web or
   * will open in app browser if the context is embed.
   */
  LINK = "LINK",
  /**
   * Modal action will open a modal.
   */
  MODAL = "MODAL",
  INLINE = "INLINE",
  /**
   * Function action will execute a function.
   */
  FUNCTION = "FUNCTION",
  CONFIRMATION = "CONFIRMATION_MODAL",
  SEARCH_CMD = "SEARCH_CMD",
  /**
   * Triggers an event - subscribers will take care of the action.
   */
  EVENT = "EVENT",
  /**
   * Action will be opened as a resource.
   */
  RESOURCE = "RESOURCE",
  /**
   * Component specifically for caching.
   */
  CACHE = "CACHE",
  /**
   * Actions that can take full page or can run on the right panel
   */
  LIVE = "LIVE"
}

/**
 * @deprecated
 */
export enum PaintType {
  YSTACK,
  XSTACK,
  YMENU,
  XMENU,
  PANEL_ON_LEFT,
  JUMP_TO_PARENT
}

/**
 * @deprecated
 */
export enum ThinModeBehavior {
  JUMP_TO_PARENT,
  GRAND_CHILDREN_ON_MENU,
  RIGHT_PANEL_AS_PLAYER,
  YSTACK,
  HIDE
}

/**
 * @deprecated
 */
export enum ContentType {
  BLOCK,
  SECTION,
  INLINE,
  BUTTON,
  TOGGLE,
  SPACE_DOC
}
