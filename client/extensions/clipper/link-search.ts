import { activeResourceFilter } from "@nucleum/datafn/resource-filters";
import { Resource } from "@nucleum/datafn/resource.enum";
import {
  determineResourceType,
  removeDuplicatesFilter
} from "@nucleum/datafn/resource.utils";
import { isValidString } from "@21n/shared-utils/text.utils";
import {
  headingNodeTypes,
  rootNodeTypeList
} from "@nucleum/features/memory/node/node.type";
import {
  extensionDatafn,
  DatafnExtensionMethod
} from "@nucleum/extensions/extension.store";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { parse } from "@21n/shared-utils/json.utils";
import { isValidArray } from "@21n/shared-utils/obj.utils";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { highlightSearchQuery } from "@nucleum/features/memory/linking/search-results.utils";
import { combinedSearchSort } from "@nucleum/features/memory/linking/link-search";

export async function queryLinkingSearchResultsOnExtension(
  query: string,
  resource?: Resource
) {
  let nodes: unknown[] = [];
  const isValidSearchQuery = isValidString(query);
  if (resource === Resource.node || !resource) {
    nodes = (await extensionDatafn({
      method: DatafnExtensionMethod.SELECT_MANY,
      args: {
        resource: Resource.node,
        params: {
          filters: {
            contentType: { $in: [...rootNodeTypeList, ...headingNodeTypes] }
          },
          search: isValidSearchQuery
            ? {
                fields: ["body", "label", "text"],
                query
              }
            : undefined,
          limit: 100,
          sort: isValidSearchQuery ? undefined : ["-updatedAt"]
        }
      }
    })) as unknown[];
  }
  let collections: unknown[] = [];
  if (resource === Resource.collection || !resource) {
    collections = (await extensionDatafn({
      method: DatafnExtensionMethod.SELECT_MANY,
      args: {
        resource: Resource.collection,
        params: {
          filters: {
            resource: Resource.node
          },
          search: isValidSearchQuery
            ? {
                fields: ["label"],
                query
              }
            : undefined,
          limit: 100,
          sort: isValidSearchQuery ? undefined : ["-updatedAt"]
        }
      }
    })) as unknown[];
  }
  let recentItemsArray = [];
  if (!isValidSearchQuery) {
    try {
      const recentItems = await clientStorage.get(ClientStorageKey.RECENTS);
      recentItemsArray = recentItems ? parse(recentItems) : [];
      if (recentItemsArray.length > 0) {
        recentItemsArray = recentItemsArray.filter((x: any) => {
          const itemResourceType = determineResourceType(x.id);
          return (
            itemResourceType === resource ||
            (!resource &&
              (itemResourceType === Resource.node ||
                itemResourceType === Resource.collection))
          );
        });
      }
    } catch (e) {
      logger.error({
        at: "queryLinkingSearchResultsOnExtension - recentItems",
        error: e
      });
    }
  }
  let data = [...recentItemsArray, ...(nodes ?? []), ...(collections ?? [])]
    .filter(activeResourceFilter)
    .filter(removeDuplicatesFilter);
  if (isValidString(query) && isValidArray(data)) {
    data = highlightSearchQuery(data, query);
    data = data.filter((x) => x.labelSearch || x.bodySearch);
    data = data.sort(combinedSearchSort);
  }
  return data;
}
