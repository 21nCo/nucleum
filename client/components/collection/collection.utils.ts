import {
  CollectionType,
  type ICollectionExpanded,
  type ICollectionItem
} from "@21n/components/collection/collection.type";
import type { IRecordId } from "@21n/types/data.type";
import type { IProperty } from "@21n/components/collection/properties/property.type";
import { PropertyType } from "@21n/components/collection/properties/property.type";
import {
  resolvePropertyOptions as _resolvePropertyOptions,
  resolveUniversalPropertyOptions
} from "@21n/components/collection/properties/property.utils";
import {
  isNoneResource,
  resourceInList
} from "@21n/components/flux/resourceStores/resource.utils";
import type { ISelectItem } from "@21n/types/select.type";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { Product } from "@21n/products/product.type";
import type { IAvatar } from "@21n/types/avatar.type";

export const UNASSIGNED_VALUE = "unassigned";
export const UNASSIGNED_LABEL = "Unassigned";

function resolveGroupingCountKey(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return value.toString();
  }
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") return JSON.stringify(value);
  return UNASSIGNED_VALUE;
}

export function resolveCollectionTypeIcon(type: CollectionType) {
  switch (type) {
    case CollectionType.UNTYPED:
      return "collection";
    case CollectionType.TYPED:
      return "cube";
    case CollectionType.QUERY:
      return "ph:database-light";
    case CollectionType.SYNCED:
      return "sync";
  }
}

export function resolveCollectionTypeLabel(type: CollectionType) {
  switch (type) {
    case CollectionType.UNTYPED:
      return "Simple";
    case CollectionType.TYPED:
      return "Typed";
    case CollectionType.QUERY:
      return "Query";
    case CollectionType.SYNCED:
      return "Synced";
  }
}

export interface IPropertyOption extends ISelectItem {
  color?: number;
}

export function calculateGroupingCounts(
  data: ICollectionItem[],
  propertyId: IRecordId
): Map<string, number> {
  if (!data) return new Map<string, number>();

  const counts = new Map<string, number>();
  counts.set(UNASSIGNED_VALUE, 0);

  if (propertyId) {
    data.forEach((node) => {
      const prop = node.properties?.find(resourceInList(propertyId))?.value;
      if (!prop || prop === UNASSIGNED_VALUE) {
        counts.set(UNASSIGNED_VALUE, (counts.get(UNASSIGNED_VALUE) || 0) + 1);
      } else if (Array.isArray(prop)) {
        prop.forEach((value) => {
          const key = resolveGroupingCountKey(value);
          counts.set(key, (counts.get(key) || 0) + 1);
        });
      } else {
        const key = resolveGroupingCountKey(prop);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
  }
  return counts;
}

export function filterNodesByPropertyValue(
  data: ICollectionItem[],
  propertyId: IRecordId,
  value: string
): ICollectionItem[] {
  if (value === UNASSIGNED_VALUE) {
    return data?.filter((node: ICollectionItem) => {
      const propValue = node.properties?.find(resourceInList(propertyId));
      return (
        !propValue ||
        propValue.value === UNASSIGNED_VALUE ||
        (Array.isArray(propValue.value) && propValue.value.length === 0)
      );
    });
  }
  return data?.filter((node: ICollectionItem) => {
    const prop = node.properties?.find(resourceInList(propertyId));
    if (!prop?.value) return false;
    if (Array.isArray(prop.value)) {
      return prop.value.includes(value);
    }
    return prop.value === value;
  });
}

/**
 * @param id - The id of the property to resolve options for. - comes from view.groupBy or view.subGroupBy or view.tabBy
 * @param properties - All properties in the collection.
 * @param counts - The counts of items in the collection grouped by property options.
 * @param additionalParams - The additional parameters to resolve options for.
 * @returns resolved options for a grouping property
 */
export function resolveOptionsForGrouping(
  id: IRecordId,
  properties: IProperty[],
  counts: Map<string, number>,
  additionalParams: { isBoardView?: boolean } = {}
): IPropertyOption[] {
  if (isNoneResource(id) || !properties?.find(resourceInList(id))) return [];

  const property = properties?.find(resourceInList(id));
  if (!property) return [];

  const unassignedOption = {
    label: UNASSIGNED_LABEL,
    value: UNASSIGNED_VALUE
  };
  let propertyOptions = [];
  if (property.type === PropertyType.UNIVERSAL && property.config?.type) {
    propertyOptions = resolveUniversalPropertyOptions(property.config.type);
    const filteredOptions = propertyOptions
      .filter((option) => {
        const count = counts.get(option.id?.toLowerCase());
        return count && count > 0;
      })
      .map((option) => ({
        label: `${option.icon ? option.icon + " " : ""}${option.label}`,
        value: option.id?.toLowerCase(),
        color: option.color
      }));
    if (additionalParams.isBoardView) {
      return [unassignedOption, ...filteredOptions];
    } else return filteredOptions;
  } else {
    propertyOptions = _resolvePropertyOptions(id, properties, additionalParams);
    const filteredOptions = propertyOptions.filter((option) => {
      const count = counts.get(resolveGroupingCountKey(option.value));
      return count && count > 0;
    });
    if (additionalParams.isBoardView) {
      return [unassignedOption, ...filteredOptions];
    } else return filteredOptions;
  }
}

export function resolveCollectionSubTypesForSwitcher() {
  const collectionTypes = [
    CollectionType.UNTYPED,
    CollectionType.TYPED
    // CollectionType.QUERY
  ].map((x) => {
    return {
      label: resolveCollectionTypeLabel(x),
      value: x.toLowerCase(),
      icon: resolveCollectionTypeIcon(x)
    };
  });
  return collectionTypes;
}

export function resolveCollectionResource(product: Product): Resource[] {
  switch (product) {
    case Product.POINTRON:
      return [Resource.goal];
    case Product.MEMOTRON:
      return [Resource.node];
    case Product.NUCLEUM:
      return [Resource.node, Resource.goal];
    default:
      return [];
  }
}

export function resolveAvatar(types: ICollectionExpanded[]) {
  const avatars = types
    ?.flatMap((x) => [x.avatar])
    .filter((a) => a) as IAvatar[];
  const baseAvatars = types
    ?.flatMap((x) => [x.typeToExtend?.avatar])
    .filter((a) => a) as IAvatar[];
  if (baseAvatars.length > 0) {
    return baseAvatars;
  } else {
    return avatars;
  }
}
