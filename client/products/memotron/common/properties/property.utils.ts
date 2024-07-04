import {
  PropertyType,
  type IProperty
} from "$lib/client/types/memotron/type.type";
import type { INodeProperty } from "$lib/client/types/memotron/node.type";

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
  properties: IProperty[],
  nodeProperties: INodeProperty[] | undefined
) {
  return properties.map((property) => {
    const nodeProperty = nodeProperties?.find((v) => v.id === property.id);
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
