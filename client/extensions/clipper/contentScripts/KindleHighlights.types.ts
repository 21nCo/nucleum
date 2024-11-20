export type NextPageState = {
  token: string;
  contentLimitState: string;
};

/**
 * @deprecated - use NodeType instead
 */
export enum contentType {
  BookNode = "KINDLE_NOTES&HIGHLIGHTS_BOOK",
  HighlightNode = "KINDLE_NOTE&HIGHLIGHT"
}

/**
 * @deprecated - use IKindleBookBody instead
 */
export type Book = {
  id: string;
  title: string;
  author: string;
  asin?: string;
  url?: string;
  imageUrl?: string;
  lastAnnotatedDate?: Date;
};

/**
 * @deprecated - use IKindleBook instead
 */
export type BookNode = {
  body: Book;
  contentType: contentType.BookNode;
};

/**
 * @deprecated - use IKindleHighlightBody instead
 */
export type Highlight = {
  id: string;
  text: string;
  location?: string;
  page?: string;
  note?: string;
  color?: "pink" | "blue" | "yellow" | "orange";
  createdDate?: Date;
};

/**
 * @deprecated - use IKindleHighlight instead
 */
export type HighlightNode = {
  body: Highlight;
  contentType: contentType.HighlightNode;
  parent: string;
};

/**
 * @deprecated - use IKindleBook instead
 */
export type SavedBookNode = {
  id: string;
  body: Book;
  contentType: contentType.BookNode;
  createdAt: string;
  modifiedAt: string;
  isArchived: boolean;
  isStarred: boolean;
};

/**
 * @deprecated - use SyncStatus instead
 */
export enum kindleSyncState {
  Sync = "SYNC",
  Syncing = "SYNCING",
  Synced = "Synced"
}

export type AmazonAccountRegion =
  | "global"
  | "india"
  | "japan"
  | "spain"
  | "germany"
  | "italy"
  | "UK"
  | "france";

export type AmazonAccount = {
  name: string;
  hostname: string;
  kindleReaderUrl: string;
  notebookUrl: string;
};
