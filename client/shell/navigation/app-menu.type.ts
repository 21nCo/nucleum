/** App menu settings stored per product in the appMenu DataFn KV record. */
export type IAppMenuStore = {
  [product: string]: IAppMenu;
};

/** One product's app menu entry. */
export type IAppMenu = {
  default?: string[];
  mobile?: string[];
  /** Resource types pinned as browse pages. */
  user?: string[];
  /** Space ids pinned below the product's destinations, in pin order. */
  spaces?: string[];
  /** The space that former resource-type pins and app tabs were moved into. */
  pinnedSpaceId?: string;
  /** Whether app tabs were moved into the pinned space. They move only once. */
  tabsMigrated?: boolean;
  /** Whether the pinned space was created but not yet pinned to the app menu. */
  pinnedSpacePinPending?: boolean;
};
