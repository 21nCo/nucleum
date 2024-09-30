import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
import type { INodePropertyValue } from "$lib/client/products/memotron/node/node.type";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import { type IProperty, PropertyType } from "./property.type";
import type { ISelectItem } from "$lib/client/types/select.type";

export function resolvePropertyDefaultValue(property: IProperty) {
  let fallback;
  switch (property.type) {
    case PropertyType.TEXT:
      fallback = "";
      break;
    case PropertyType.CHECKBOX:
      fallback = false;
      break;
    case PropertyType.RATING:
      fallback = 0;
      break;
    case PropertyType.SINGLE_SELECT:
      fallback = property?.config?.options?.[0]?.id ?? "";
      break;
    case PropertyType.DATE:
      fallback = new Date();
      break;
    default:
      fallback = "";
      break;
  }
  return property.default ?? fallback;
}

export function mapPropertyValues(
  properties: IProperty[] | undefined,
  nodeProperties: INodePropertyValue[] | undefined
) {
  if (!properties) return [];
  return properties.map((property) => {
    const nodeProperty = nodeProperties?.find(resourceInList(property));
    return {
      id: property.id,
      value: nodeProperty?.value ?? resolvePropertyDefaultValue(property)
    };
  });
}

export function lookupAddressFromLatLong(lat: number, long: number) {
  //TODO - move this to backend
  const googleApiKey = import.meta.env?.VITE_GOOGLE_API_KEY;
  return fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}&key=${googleApiKey}`
  ).then((response) => response.json());
}

/**
 * Filters properties that are marked for capture
 * @param properties
 * @returns
 */
export function resolvePropertiesForCapture(properties: IProperty[]) {
  if (!isValidArrayWithData(properties)) return [];
  return properties.filter((item: IProperty) => {
    return item.isShowOnCapture;
  });
}

/**
 * Filters properties that are marked for capture
 * @param properties
 * @returns
 */
export function resolvePropertiesForNodePage(properties: IProperty[]) {
  if (!isValidArrayWithData(properties)) return [];
  return properties.filter((item: IProperty) => {
    return item.isShowOnNodePage;
  });
}

export function resolvePropertyOptions(
  id: string,
  properties: IProperty[] | null
): ISelectItem[] {
  if (!id || !properties) return [];
  const property = properties.find((p) => p.id === id);
  if (!property) return [];
  if (
    property.type === PropertyType.SINGLE_SELECT ||
    property.type === PropertyType.MULTI_SELECT
  ) {
    if (!property?.config?.options) return [];
    return property.config.options.map((option) => ({
      value: option.id,
      label: option.label,
      color: option.color
    }));
  } else if (property.type === PropertyType.RATING) {
    return [1, 2, 3, 4, 5].map((value) => ({
      value,
      label: value.toString()
    }));
  } else if (property.type === PropertyType.CHECKBOX) {
    return [
      {
        value: true,
        label: "True"
      },
      {
        value: false,
        label: "False"
      }
    ];
  }
  return [];
}
