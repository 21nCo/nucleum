import { resolveResourceLabel, resolveResourceIcon, availableResources } from "@nucleum/datafn/resource.utils";

import { Resource } from "@nucleum/datafn/resource.enum";
import { Product } from "@nucleum/client/config/product.type";
import {
  nextProductSectionsPre,
  nextProductSectionsPost
} from "@nucleum/next/product.config";

import type { IResourceSwitchItem } from "@21n/ui/elements/select/select.type";

export function resolveResourceSwitcher(): IResourceSwitchItem[] {
  return Object.values(Resource).map((resource) => ({
    label: resolveResourceLabel(resource),
    value: resource,
    icon: resolveResourceIcon(resource),
    isDisabled: !availableResources.has(resource),
    badge: !availableResources.has(resource) ? "Planned" : undefined
  }));
}

const isProductSection = (value: string): value is Product =>
  Object.values(Product).includes(value as Product);

/** Product sections of the Nucleum library switcher in display order. */
export function resolveLibrarySwitcherSections(): Product[] {
  return [
    Product.NUCLEUM,
    Product.POINTRON,
    ...nextProductSectionsPre,
    Product.MEMOTRON,
    ...nextProductSectionsPost
  ].filter(isProductSection);
}

/**
 * Resources a Nucleum library switcher section lists: the section product's browse
 * resources, without planned resources outside development and without resources
 * already listed in the Nucleum section.
 */
export function resolveLibrarySwitcherSectionResources(
  section: Product,
  resolveBrowseResources: (product: Product) => Resource[],
  isDev: boolean
): Resource[] {
  const nucleumResources = resolveBrowseResources(Product.NUCLEUM);
  return resolveBrowseResources(section).filter(
    (resource) =>
      Object.values(Resource).includes(resource) &&
      (isDev || availableResources.has(resource)) &&
      (section === Product.NUCLEUM || !nucleumResources.includes(resource))
  );
}

/** Every resource the Nucleum library switcher lists across its sections. */
export function resolveLibrarySwitcherResources(
  resolveBrowseResources: (product: Product) => Resource[],
  isDev: boolean
): Resource[] {
  return [
    ...new Set(
      resolveLibrarySwitcherSections().flatMap((section) =>
        resolveLibrarySwitcherSectionResources(
          section,
          resolveBrowseResources,
          isDev
        )
      )
    )
  ];
}
