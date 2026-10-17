import {
  nucleumDatafnSchema,
  type NucleumDatafnResource
} from "@nucleum/schema";
import { resolveProductResourceConfig } from "@nucleum/schema/product.config";
import type { Product } from "@nucleum/client/config/product.type";

type NucleumDatafnSchemaResource =
  (typeof nucleumDatafnSchema.resources)[number];

const isRemoteOnlySchemaResource = (resource: NucleumDatafnSchemaResource) =>
  "isRemoteOnly" in resource && resource.isRemoteOnly === true;

const isValidDatafnSchemaResourceName = (
  resource: unknown,
  resources: Set<NucleumDatafnResource>
): resource is NucleumDatafnResource =>
  typeof resource === "string" &&
  resources.has(resource as NucleumDatafnResource);

/** Returns cloneable resources configured for a product. */
export function resolveDatafnProductResources(
  product: Product
): NucleumDatafnResource[] {
  const cloneableResources = new Set(
    nucleumDatafnSchema.resources
      .filter((resource) => !isRemoteOnlySchemaResource(resource))
      .map((resource) => resource.name)
  );
  const configuredResources = resolveProductResourceConfig(product, {
    isDev: import.meta.env?.DEV
  });
  const configuredResourceNames = [
    ...configuredResources.table,
    ...configuredResources.browse
  ].map((resource) => resource.toString());
  const productResources: NucleumDatafnResource[] = [];
  for (const resource of configuredResourceNames) {
    if (
      !productResources.includes(resource as NucleumDatafnResource) &&
      isValidDatafnSchemaResourceName(resource, cloneableResources)
    ) {
      productResources.push(resource);
    }
  }
  return productResources;
}

/** Returns resources needed for initial product browsing. */
export function resolveDatafnBootResources(product: Product): string[] {
  const cloneableResources = new Set(
    nucleumDatafnSchema.resources
      .filter((resource) => !isRemoteOnlySchemaResource(resource))
      .map((resource) => resource.name)
  );
  return resolveProductResourceConfig(product, {
    isDev: import.meta.env?.DEV
  })
    .browse.map((resource) => resource.toString())
    .filter((resource) =>
      isValidDatafnSchemaResourceName(resource, cloneableResources)
    );
}

/** Returns cloneable resources outside the boot set. */
export function resolveDatafnBackgroundResources(product: Product): string[] {
  const boot = new Set(resolveDatafnBootResources(product));
  return resolveDatafnProductResources(product).filter(
    (resource) => !boot.has(resource)
  );
}
