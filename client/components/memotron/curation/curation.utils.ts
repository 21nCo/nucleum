import type { IProperty } from "$lib/client/types/memotron/type.type";
import type { ISelectItem } from "$lib/client/types/select.type";

export function resolvePropertyOptions(
  id: string,
  properties: IProperty[] | null
): ISelectItem[] {
  if (!id || !properties) return [];
  const property = properties.find((p) => p.id === id);
  if (!property?.config?.options) return [];
  return property.config.options.map((option) => ({
    value: option.id,
    label: option.label,
    color: option.color
  }));
}
