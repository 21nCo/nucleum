import { features, resolveProductTableNames } from '@nucleum/schema/features';
import { Product } from '@nucleum/schema/product.type';

/** Apps whose tokens see only their own resources and filtered shared ones. */
export const SCOPED_APPS = ['memotron', 'pointron'] as const;

/** An app whose tokens are limited to its own and filtered shared resources. */
export type ScopedApp = (typeof SCOPED_APPS)[number];

/**
 * How an app-scoped token sees a resource that both apps own:
 * `field` filters by a field naming the item's resource type, `items` filters
 * a space's item tree by the type each item points at, and `none` means the
 * resource carries nothing to filter by, so only `nucleum` tokens reach it.
 */
export type SharedResourcePolicy =
  | { kind: 'field'; field: 'resource' }
  | { kind: 'items'; field: 'items' }
  | { kind: 'none' };

/** Server-side resource ownership derived from the product feature sets. */
export interface ResourceOwnership {
  /** Every resource an app's feature set declares, shared ones included. */
  tables: Readonly<Record<ScopedApp, ReadonlySet<string>>>;
  /** Resources declared by more than one app, with their filtering policy. */
  shared: ReadonlyMap<string, SharedResourcePolicy>;
}

const productByApp: Record<ScopedApp, Product> = {
  memotron: Product.MEMOTRON,
  pointron: Product.POINTRON
};

/**
 * Builds the ownership table from `productFeatures` in `@nucleum/schema`, so
 * a resource added to a product's features is owned by that app's tokens.
 */
export function buildResourceOwnership(): ResourceOwnership {
  const tables = {
    memotron: new Set(resolveProductTableNames(productByApp.memotron)),
    pointron: new Set(resolveProductTableNames(productByApp.pointron))
  };
  const shared = new Map<string, SharedResourcePolicy>();
  for (const name of tables.memotron) {
    if (tables.pointron.has(name)) shared.set(name, sharedPolicyFor(name));
  }
  return { tables, shared };
}

function sharedPolicyFor(name: string): SharedResourcePolicy {
  const fields = resourceFieldNames(name);
  if (fields.has('resource')) return { kind: 'field', field: 'resource' };
  if (name === 'space' && fields.has('items')) {
    return { kind: 'items', field: 'items' };
  }
  return { kind: 'none' };
}

function resourceFieldNames(name: string): Set<string> {
  for (const feature of Object.values(features)) {
    const resource = feature.resources.find((entry) => entry.name === name);
    if (resource) return new Set(resource.fields.map((field) => field.name));
  }
  return new Set();
}

/** Ownership table built once from the current product feature sets. */
export const resourceOwnership = buildResourceOwnership();
