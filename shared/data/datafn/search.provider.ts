import { nucleumDatafnSchema } from "./schema.datafn";

export type NucleumDatafnSearchResourceFields = Record<string, string[]>;

/** Default SearchFn query behavior used by DataFn client and server search. */
export const nucleumDatafnSearchDefaults = {
  prefix: true,
  fuzzy: 1,
  fieldBoosts: {
    label: 4,
    title: 3,
    text: 1.5,
    notes: 1.25
  }
} as const;

/** Text pipeline settings for local IndexedDB-backed SearchFn indexes. */
export const nucleumDatafnSearchPipeline = {
  enableStemming: true,
  enableEdgeNGrams: true,
  edgeNGramMinLength: 2,
  edgeNGramMaxLength: 20,
  edgeNGramFieldConfig: {
    label: { enabled: true, minLength: 1, maxLength: 30 },
    title: { enabled: true, minLength: 1, maxLength: 30 }
  }
} as const;

/** Search indexing disclosure for local and server-side resource fields. */
export const nucleumDatafnSensitiveSearchReview = {
  localIndexedFields: {
    node: ["label", "text", "notes"],
    collection: ["label"],
    space: ["label"],
    file: ["label"],
    objective: ["label"],
    task: ["label"]
  },
  serverIndexedFields: {
    mode: "account-service-opensearch",
    externalProviderEgress: true,
    fields: {
      node: ["label", "text", "notes"],
      collection: ["label"],
      space: ["label"],
      file: ["label"],
      objective: ["label"],
      task: ["label"]
    }
  }
} as const;

const nucleumDatafnSearchIndexSchemaVersion = "v2";

/** Resolves the app-owned SearchFn index version for persistent local indexes. */
export function resolveNucleumDatafnSearchIndexVersion(): string {
  return [
    "nucleum-datafn-search",
    nucleumDatafnSearchIndexSchemaVersion,
    stableSearchConfigHash({
      defaults: nucleumDatafnSearchDefaults,
      pipeline: nucleumDatafnSearchPipeline,
      fields: resolveNucleumDatafnSearchResourceFields()
    })
  ].join(":");
}

/** Resolves DataFn schema search indices into SearchFn resource field mappings. */
export function resolveNucleumDatafnSearchResourceFields(): NucleumDatafnSearchResourceFields {
  const fields: NucleumDatafnSearchResourceFields = {};
  for (const resource of nucleumDatafnSchema.resources) {
    const searchFields = Array.isArray(resource.indices)
      ? []
      : (resource.indices && "search" in resource.indices
          ? resource.indices.search
          : []) ?? [];
    if (searchFields.length > 0) {
      fields[resource.name] = [...searchFields];
    }
  }
  return fields;
}

function stableSearchConfigHash(value: unknown): string {
  const raw = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
