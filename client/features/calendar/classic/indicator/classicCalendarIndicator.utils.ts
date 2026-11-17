import { MetaResource, Resource } from "@nucleum/datafn/resource.enum";
import { Product } from "@nucleum/client/config/product.type";

type IndicatorResources = readonly (Resource | MetaResource)[];

const pointronIndicatorResources: IndicatorResources = Object.freeze([
  Resource.task,
  Resource.session
]);
const memotronIndicatorResources: IndicatorResources = Object.freeze([
  Resource.node,
  MetaResource.calendarNotes
]);
const nucleumIndicatorResources: IndicatorResources = Object.freeze([
  Resource.task,
  Resource.session,
  Resource.node,
  MetaResource.calendarNotes
]);
const noIndicatorResources: IndicatorResources = Object.freeze([]);

/**
 * Resources whose records show as classic calendar tile indicators for a
 * product. Returns the same array for the same product, so a caller deriving
 * it from the app store does not rebuild the indicator queries whenever an
 * unrelated part of the store changes.
 */
export function resolveIndicatorResources(
  product: Product | undefined
): IndicatorResources {
  switch (product) {
    case Product.POINTRON:
      return pointronIndicatorResources;
    case Product.MEMOTRON:
      return memotronIndicatorResources;
    case Product.NUCLEUM:
      return nucleumIndicatorResources;
    default:
      return noIndicatorResources;
  }
}

/**
 * Resolves the display color token used by classic calendar tile indicators.
 */
export function resolveIndicatorColor(resource: Resource | MetaResource) {
  switch (resource) {
    case Resource.task:
      return "fgs4";
    case Resource.sessionLog:
    case Resource.session:
      return "aps1";
    case Resource.node:
    case MetaResource.calendarNotes:
      return "aps1";
    default:
      return "fgs4";
  }
}
