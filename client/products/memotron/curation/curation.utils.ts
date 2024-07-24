import type { ISelectItem } from "$lib/client/types/select.type";
import {
  type IProperty,
  PropertyType
} from "../collection/properties/property.type";

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
