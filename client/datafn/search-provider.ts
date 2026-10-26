import {
  nucleumDatafnSearchDefaults,
  nucleumDatafnSearchPipeline,
  resolveNucleumDatafnSearchResourceFields
} from "@nucleum/schema";
import { createSearchProvider } from "@searchfn/datafn-provider";
import { IndexedDbAdapter } from "@searchfn/adapter-indexeddb";

export type SearchProvider = {
  readonly name: string;
  search(params: {
    resource: string;
    query: string;
    type?: "fullText" | "semantic";
    fields?: string[];
    limit?: number;
    prefix?: boolean;
    fuzzy?: boolean | number;
    fieldBoosts?: Record<string, number>;
    namespaceFilter?: string[];
    regionFilter?: string[];
    signal?: AbortSignal;
  }): Promise<string[]>;
  searchAll?(params: {
    query: string;
    resources?: string[];
    fields?: string[];
    limit?: number;
    limitPerResource?: number;
    prefix?: boolean;
    fuzzy?: boolean | number;
    fieldBoosts?: Record<string, number>;
    namespaceFilter?: string[];
    regionFilter?: string[];
    signal?: AbortSignal;
  }): Promise<Array<{ resource: string; id: string; score: number }>>;
  updateIndices(params: {
    resource: string;
    records: Record<string, unknown>[];
    operation: "upsert" | "delete";
  }): Promise<void>;
  initialize?(config: {
    resources: Array<{ name: string; searchFields: string[] }>;
  }): Promise<void>;
  dispose?(): Promise<void>;
};

/** Creates the search provider for the selected DataFn storage namespace. */
export function createNucleumClientSearchProvider(input: {
  dbName: string;
}): SearchProvider | undefined {
  if (typeof indexedDB === "undefined") return undefined;
  return createSearchProvider(
    new IndexedDbAdapter({
      dbName: input.dbName,
      pipeline: nucleumDatafnSearchPipeline,
      defaults: nucleumDatafnSearchDefaults,
      cache: {
        terms: 4096,
        vectors: 1024
      }
    }),
    {
      resourceFields: resolveNucleumDatafnSearchResourceFields()
    }
  );
}

/** Disposes an installed search provider before runtime teardown. */
export async function disposeNucleumDatafnSearchProvider(
  provider: SearchProvider | undefined
) {
  if (!provider?.dispose) return;
  await provider.dispose();
}
