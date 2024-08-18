import type { IObservableStoreSubject } from "$lib/client/types/data.type";

export type IHighlighter = {
  id: string;
  label: string;
  color: string;
  isArchived?: boolean;
};

export type IHighlightStore = IObservableStoreSubject & {
    highlighters: IHighlighter[];
}