declare module "./alias-utils.mjs" {
  export type AliasMap = Record<string, string>;

  export function loadAliasMap(): AliasMap;

  export function buildTsconfigPaths(
    aliasMap: AliasMap,
    baseDir?: string
  ): Record<string, string[]>;

  export function buildViteAliases(
    aliasMap: AliasMap,
    projectRoot?: string
  ): Record<string, string>;

  export const DISALLOWED_IMPORT_PATTERNS: RegExp[];

  export function isAliasPath(value: string, aliasMap?: AliasMap): boolean;

  export function isDisallowedImport(value: string): boolean;

  export function getAliasEntries(): {
    aliasMap: AliasMap;
    tsconfigPaths: Record<string, string[]>;
    viteAliases: Record<string, string>;
  };
}

declare module "./alias-utils.cjs" {
  export * from "./alias-utils.mjs";
}
