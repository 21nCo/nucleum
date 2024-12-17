import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
import type { INodePropertyValue } from "$lib/client/products/memotron/node/node.type";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import {
  type IProperty,
  type IPropertyConfig,
  type IPropertyConfigOption,
  PropertyType,
  UniversalPropertyType
} from "./property.type";
import type { ISelectItem } from "$lib/client/types/select.type";
import type { IRecordId } from "$lib/client/types/data.type";
import { enumToString, isValidString } from "$lib/shared/utils/text.utils";
import type { OmitForCaptureWithId } from "$lib/client/components/flux/resourceStores/resource.type";
import { propertyOptions } from "./property.store";
import { AvatarType } from "$lib/client/types/avatar.type";
import { iso31661CountryCodes } from "./countries";
import { languages } from "./languages";

export function resolvePropertyDefaultValue(type: PropertyType) {
  switch (type) {
    case PropertyType.TEXT:
      return "";
    case PropertyType.CHECKBOX:
      return false;
    case PropertyType.RATING:
      return 0;
    case PropertyType.SINGLE_SELECT:
    case PropertyType.MULTI_SELECT:
      return "none";
    case PropertyType.DATE:
      return new Date();
    default:
      return "";
  }
}

/**
 * @deprecated
 * @param properties
 * @param nodeProperties
 * @returns
 */
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

export const tabAndGroupableProperties = [
  PropertyType.SINGLE_SELECT,
  PropertyType.MULTI_SELECT,
  PropertyType.CHECKBOX,
  PropertyType.RATING
];

export function resolvePropertyOptions(
  id: IRecordId,
  properties: IProperty[] | null,
  params?: {
    isBoardView?: boolean;
  }
): ISelectItem[] {
  if (!id || !properties) return [];
  const property = properties.find(resourceInList(id));
  if (!property || !tabAndGroupableProperties.includes(property.type))
    return [];
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
      label: params?.isBoardView
        ? property.label + ": " + value.toString()
        : value.toString()
    }));
  } else if (property.type === PropertyType.CHECKBOX) {
    return [
      {
        value: true,
        label: params?.isBoardView ? property.label + ": True" : "True"
      },
      {
        value: false,
        label: params?.isBoardView ? property.label + ": False" : "False"
      }
    ];
  }
  return [];
}

export const assignDefaultLabelAsFallback = (
  property: OmitForCaptureWithId<IProperty>
) => {
  return {
    ...property,
    label: isValidString(property.label)
      ? property.label
      : enumToString(property.type)
  };
};

export function resolvePropertyIcon(property: IProperty) {
  return (
    propertyOptions.find((x) => x.value === property.type)?.icon ??
    "ph:circle-dashed-light"
  );
}

export function resolvePropertyDefaultConfig(
  type: PropertyType
): IPropertyConfig {
  if (type === PropertyType.RATING) {
    return {
      ratingAvatar: {
        type: AvatarType.ICON,
        code: "&#XF09A",
        name: "star_outline",
        frequency: 0,
        isFilled: false,
        color: "bg"
      }
    };
  } else if (
    type === PropertyType.SINGLE_SELECT ||
    type === PropertyType.MULTI_SELECT
  ) {
    return {
      options: [],
      groups: []
    };
  } else if (type === PropertyType.UNIVERSAL) {
    return {
      type: UniversalPropertyType.NONE,
      isMultiSelect: false
    };
  }
  return {};
}

export function resolveUniversalPropertyOptions(
  type: UniversalPropertyType
): IPropertyConfigOption[] {
  switch (type) {
    case UniversalPropertyType.COUNTRY:
      return resolveCountryOptions();
    case UniversalPropertyType.LANGUAGE:
      return resolveLanguageOptions();
    case UniversalPropertyType.CURRENCY:
      return resolveCurrencyOptions();
    case UniversalPropertyType.CONTINENT:
      return resolveContinentOptions();
    case UniversalPropertyType.TIMEZONE:
      return resolveTimezoneOptions();
    default:
      return [];
  }

  function resolveContinentOptions(): IPropertyConfigOption[] {
    return [
      {
        id: "africa",
        label: "Africa"
      },
      {
        id: "asia",
        label: "Asia"
      },
      {
        id: "antarctica",
        label: "Antarctica"
      },
      {
        id: "australia",
        label: "Australia"
      },
      {
        id: "europe",
        label: "Europe"
      },
      {
        id: "northamerica",
        label: "North America"
      },
      {
        id: "southamerica",
        label: "South America"
      }
    ];
  }

  function resolveCountryOptions(): IPropertyConfigOption[] {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    const countries = iso31661CountryCodes.map((code) => {
      const flag = code
        .toUpperCase()
        .replace(/./g, (char) =>
          String.fromCodePoint(char.charCodeAt(0) + 127397)
        );
      return {
        id: code.toLowerCase(),
        label: `${flag} ${displayNames.of(code) || code}`
      };
    });
    return countries;
  }

  function resolveLanguageOptions(): IPropertyConfigOption[] {
    return languages.map((language) => ({
      id: language.code,
      label: language.name
    }));
  }

  function resolveCurrencyOptions(): IPropertyConfigOption[] {
    return Intl.supportedValuesOf("currency").map((code) => {
      const symbol = new Intl.NumberFormat("en", {
        style: "currency",
        currency: code,
        currencyDisplay: "symbol"
      })
        .format(0)
        .replace(/[0-9.,]/g, "")
        .trim();

      return {
        id: code.toLowerCase(),
        label: `${symbol} ${new Intl.DisplayNames(["en"], { type: "currency" }).of(code) || code}`
      };
    });
  }

  function resolveTimezoneOptions(): IPropertyConfigOption[] {
    return Intl.supportedValuesOf("timeZone").map((zone) => {
      const date = new Date();

      const localDate = new Date(
        date.toLocaleString("en-US", { timeZone: zone })
      );
      const utcDate = new Date(
        date.toLocaleString("en-US", { timeZone: "UTC" })
      );
      const diffMinutes =
        (localDate.getTime() - utcDate.getTime()) / (1000 * 60);

      const hours = Math.floor(Math.abs(diffMinutes) / 60);
      const minutes = Math.abs(diffMinutes) % 60;
      const sign = diffMinutes >= 0 ? "+" : "-";
      const offset = `UTC${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

      return {
        id: zone.toLowerCase(),
        label: `${zone.replace(/_/g, " ")} (${offset})`
      };
    });
  }
}
