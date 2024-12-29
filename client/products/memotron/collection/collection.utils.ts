import { CollectionType } from "./collection.type";
import type { INodeThumb } from "../node/node.type";
import type { IRecordId } from "$lib/client/types/data.type";
import type { IProperty } from "./properties/property.type";
import { PropertyType } from "./properties/property.type";
import {
  resolvePropertyOptions as _resolvePropertyOptions,
  resolveUniversalPropertyOptions
} from "./properties/property.utils";
import {
  isNoneResource,
  resourceInList
} from "$lib/client/components/flux/resourceStores/resource.utils";
import type { ISelectItem } from "$lib/client/types/select.type";

export const UNASSIGNED_VALUE = "unassigned";
export const UNASSIGNED_LABEL = "Unassigned";

export function resolveCollectionTypeIcon(type: CollectionType) {
  switch (type) {
    case CollectionType.UNTYPED:
      return "ph:brackets-round-light";
    case CollectionType.TYPED:
      return "ph:cube-light";
    case CollectionType.QUERY:
      return "ph:database-light";
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
  }
}

export interface IPropertyOption extends ISelectItem {
  color?: number;
}

export function calculateGroupingCounts(
  data: INodeThumb[],
  propertyId: IRecordId
): Map<string, number> {
  if (!data) return new Map();

  const counts = new Map();
  counts.set(UNASSIGNED_VALUE, 0);

  if (propertyId) {
    data.forEach((node) => {
      const prop = node.properties?.find(resourceInList(propertyId))?.value;
      if (!prop || prop === UNASSIGNED_VALUE) {
        counts.set(UNASSIGNED_VALUE, (counts.get(UNASSIGNED_VALUE) || 0) + 1);
      } else if (Array.isArray(prop)) {
        prop.forEach((value) => {
          counts.set(value, (counts.get(value) || 0) + 1);
        });
      } else {
        counts.set(prop, (counts.get(prop) || 0) + 1);
      }
    });
  }
  return counts;
}

export function filterNodesByPropertyValue(
  data: INodeThumb[],
  propertyId: IRecordId,
  value: string
): INodeThumb[] {
  if (value === UNASSIGNED_VALUE) {
    return data?.filter((node: INodeThumb) => {
      const propValue = node.properties?.find(resourceInList(propertyId));
      return (
        !propValue ||
        propValue.value === UNASSIGNED_VALUE ||
        (Array.isArray(propValue.value) && propValue.value.length === 0)
      );
    });
  }
  return data?.filter((node: INodeThumb) => {
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
      const count = counts.get(option.value);
      return count && count > 0;
    });
    if (additionalParams.isBoardView) {
      return [unassignedOption, ...filteredOptions];
    } else return filteredOptions;
  }
}
