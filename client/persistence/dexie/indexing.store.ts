import { writable } from "svelte/store";

export interface IndexingState {
  isIndexing: boolean;
  progress: number;
  currentTable: string | null;
  indexedRecords: number;
  totalRecords: number;
  error: string | null;
}

const initialState: IndexingState = {
  isIndexing: false,
  progress: 0,
  currentTable: null,
  indexedRecords: 0,
  totalRecords: 0,
  error: null
};

function createIndexingStore() {
  const { subscribe, set, update } = writable<IndexingState>(initialState);

  return {
    subscribe,
    setIndexing: (isIndexing: boolean) =>
      update((state) => ({ ...state, isIndexing })),
    setProgress: (progress: number) =>
      update((state) => ({ ...state, progress })),
    setCurrentTable: (currentTable: string | null) =>
      update((state) => ({ ...state, currentTable })),
    setIndexedRecords: (indexedRecords: number) =>
      update((state) => ({ ...state, indexedRecords })),
    setTotalRecords: (totalRecords: number) =>
      update((state) => ({ ...state, totalRecords })),
    setError: (error: string | null) =>
      update((state) => ({ ...state, error })),
    updateProgress: (payload: {
      progress?: number;
      currentTable?: string;
      indexedRecords?: number;
      totalRecords?: number;
    }) =>
      update((state) => ({
        ...state,
        progress: payload.progress ?? state.progress,
        currentTable: payload.currentTable ?? state.currentTable,
        indexedRecords: payload.indexedRecords ?? state.indexedRecords,
        totalRecords: payload.totalRecords ?? state.totalRecords
      })),
    complete: () =>
      set({
        isIndexing: false,
        progress: 100,
        currentTable: null,
        indexedRecords: 0,
        totalRecords: 0,
        error: null
      }),
    reset: () => set(initialState)
  };
}

export const indexingStore = createIndexingStore();
