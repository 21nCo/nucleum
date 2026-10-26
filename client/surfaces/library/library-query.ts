import { get } from "svelte/store";
import { Resource } from "@nucleum/datafn/resource.enum";
import { CollectionType } from "@nucleum/features/collections/collection.type";
import { rootNodeTypeList } from "@nucleum/features/memory/node/node.type";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import {
  activeResourceFilter,
  archivedResourceFilter
} from "@nucleum/datafn/resource-filters";
import context from "@nucleum/client/runtime/context.store";
import type { SubType } from "@nucleum/surfaces/library/library.type";
import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";

/** Live view inputs keep reactive query policy owned by the library surface. */
interface LibraryQueryContext {
  readonly resource: Resource;
  readonly signalResource: Resource | undefined;
  readonly selectedSubType: SubType;
  readonly isArchivedFilterSelected: boolean;
  readonly isStarFilterSelected: boolean;
  readonly isConstrainedWidth: boolean;
  readonly searchQuery: string;
}

/** Creates library queries without owning presentation or request race state. */
export function createLibraryQuery(context: LibraryQueryContext) {
  async function queryLibraryRecords(params: {
    filters: any;
    searchQuery?: string;
    limit?: number;
    offset?: number;
    signal?: AbortSignal;
  }) {
    const query = resolveLibraryQuery({
      filters: params.filters,
      subType: resolveSelectedSubType()
    });
    if (params.searchQuery?.trim()) {
      const offset = params.offset ?? 0;
      const limit = params.limit ?? 50;
      const searchLimit = offset + limit;
      const result = await datafn.search({
        query: params.searchQuery.trim(),
        resources: [query.resource],
        fields: resolveSearchFields(query.resource),
        filters: {
          [query.resource]: query.filters
        },
        limit: searchLimit,
        limitPerResource: searchLimit,
        source: get(datafnRuntime)?.mode === "sync-direct" ? "remote" : "local",
        prefix: true,
        fuzzy: 0.2,
        signal: params.signal
      });
      return normalizeLibraryRecords(
        result.results?.map((entry: any) => entry.data) ?? []
      ).slice(offset, searchLimit);
    }
    const result = await datafn.table(query.resource).query({
      select: resolveExpandedSelect(query.resource),
      filters: query.filters,
      metadata: resolveQueryMetadata(),
      sort: resolveSort(query.resource),
      limit: params.limit,
      offset: params.offset,
      signal: params.signal
    } as any);
    return normalizeLibraryRecords(result.data ?? []);
  }

  function normalizeLibraryRecords(records: any[]) {
    const { resource } = context;
    return records.filter((record) => {
      if (resource === Resource.node && record.metaType) return false;
      return resolveStatusFilter()(record);
    });
  }

  function resolveStatusFilter() {
    const { isArchivedFilterSelected } = context;
    return isArchivedFilterSelected
      ? archivedResourceFilter
      : activeResourceFilter;
  }

  function resolveQueryMetadata() {
    const { isArchivedFilterSelected } = context;
    return isArchivedFilterSelected ? { includeArchived: true } : undefined;
  }

  function resolveSearchFields(resource: Resource) {
    if (resource === Resource.node) return ["label", "text", "notes"];
    if (resource === Resource.event) return ["label", "event"];
    return ["label"];
  }

  function resolveSort(resource: Resource) {
    if (resource === Resource.event) return ["startUnix"];
    return ["-updatedAt"];
  }

  function resolveExpandedSelect(resource: Resource) {
    if (resource === Resource.collection)
      return ["*", "properties.*", "views.*", "typeToExtend.*"];
    if (resource === Resource.node)
      return [
        "*",
        "parent.*",
        "file.*",
        "collections.type",
        "collections.avatar",
        "collections.typeToExtend.avatar"
      ];
    if (resource === Resource.objective)
      return ["*", "parent.*", "children.*", "tasks.*"];
    if (resource === Resource.task) return ["*", "objective.*"];
    return undefined;
  }

  function isGenericSubType() {
    const { selectedSubType } = context;
    return ["all", "starred", "recents"].includes(selectedSubType);
  }

  function resolveFilters() {
    const { resource, selectedSubType } = context;
    let filters: any = resolveBaseFilters();
    if (!isGenericSubType()) {
      if (resource === Resource.node) {
        filters = { ...filters, contentType: selectedSubType.toUpperCase() };
      } else if (
        resource === Resource.collection ||
        resource === Resource.objective
      ) {
        filters = { ...filters, type: selectedSubType.toUpperCase() };
      } else if (resource === Resource.task) {
        if (selectedSubType === "incomplete") {
          filters = { ...filters, isChecked: false };
        }
      }
    }
    return filters;
  }

  function resolveBaseFilters() {
    const {
      isStarFilterSelected,
      selectedSubType,
      isConstrainedWidth,
      searchQuery,
      isArchivedFilterSelected
    } = context;
    return {
      isStarred:
        isStarFilterSelected || selectedSubType === "starred"
          ? true
          : isConstrainedWidth && !searchQuery
            ? false
            : undefined,
      isArchived: isArchivedFilterSelected ? true : undefined
    };
  }

  async function queryLibraryRecordCount(params: {
    filters: any;
    subType?: NodeType | CollectionType;
    signal?: AbortSignal;
  }) {
    const query = resolveLibraryQuery(params);
    const result = await datafn.table(query.resource).query({
      select: ["id", "isArchived", "trashedAt", "isAncestorInactive"],
      filters: query.filters,
      metadata: resolveQueryMetadata(),
      signal: params.signal
    } as any);
    return (result.data ?? []).filter(resolveStatusFilter()).length;
  }

  function resolveSelectedSubType() {
    const { selectedSubType } = context;
    return !isGenericSubType()
      ? (selectedSubType.toUpperCase() as NodeType | CollectionType)
      : undefined;
  }

  function resolveLibraryQuery(params: {
    filters: any;
    subType?: NodeType | CollectionType;
  }) {
    const { signalResource, resource } = context;
    const targetResource =
      signalResource ??
      (resource === Resource.relation ? Resource.linkTag : resource);
    const filters =
      targetResource === Resource.node
        ? {
            ...(params.filters ?? {}),
            contentType: params.subType
              ? params.subType
              : { $in: [...rootNodeTypeList] },
            metaType: { $is_empty: true },
            creationContext: params.subType ? undefined : { $is_empty: true }
          }
        : {
            ...(params.filters ?? {}),
            ...(targetResource === Resource.objective
              ? {
                  parentId: { $is_empty: true }
                }
              : {}),
            ...(params.subType
              ? {
                  type:
                    targetResource === Resource.objective
                      ? params.subType
                      : { $in: [params.subType] }
                }
              : {})
          };
    return { resource: targetResource, filters };
  }
  return {
    queryLibraryRecords,
    normalizeLibraryRecords,
    resolveStatusFilter,
    resolveQueryMetadata,
    resolveSearchFields,
    resolveSort,
    resolveExpandedSelect,
    isGenericSubType,
    resolveFilters,
    resolveBaseFilters,
    queryLibraryRecordCount,
    resolveSelectedSubType,
    resolveLibraryQuery
  };
}
