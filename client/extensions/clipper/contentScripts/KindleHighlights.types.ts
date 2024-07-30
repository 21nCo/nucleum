export type NextPageState = {
    token: string;
    contentLimitState: string;
  };

  export enum contentType{
    BookNode='KINDLE_NOTES&HIGHLIGHTS_BOOK',
    HighlightNode='KINDLE_NOTE&HIGHLIGHT'
  }
  export type Book = {
    id: string;
    title: string;
    author: string;
    asin?: string;
    url?: string;
    imageUrl?: string;
    lastAnnotatedDate?: Date;
  };
  export type BookNode = {
    body:Book;
    contentType:contentType.BookNode;
  };
  
  export type Highlight = {
    id: string;
    text: string;
    location?: string;
    page?: string;
    note?: string;
    color?: 'pink' | 'blue' | 'yellow' | 'orange';
    createdDate?: Date;
  };

  export type HighlightNode = {
    body:Highlight;
    contentType:contentType.HighlightNode;
    parent:string
  };

  export type SavedBookNode = {
    id:string;  
    body:Book;
    contentType:contentType.BookNode;
    createdAt:string;
    modifiedAt:string;
    isArchived:boolean;
    isStarred:boolean;
  };

  export enum kindleSyncState{
    Sync="SYNC",
    Syncing="SYNCING",
    Synced="Synced"
  }

  export type AmazonAccountRegion =
  | 'global'
  | 'india'
  | 'japan'
  | 'spain'
  | 'germany'
  | 'italy'
  | 'UK'
  | 'france';

export type AmazonAccount = {
  name: string;
  hostname: string;
  kindleReaderUrl: string;
  notebookUrl: string;
};