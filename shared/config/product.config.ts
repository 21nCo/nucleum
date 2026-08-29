import { Resource } from "@21n/shared-data/datafn/resource.enum";
import { Extension, Product } from "./product.type";

export interface IProductConfigBase {
  name: string;
  resources: {
    browse: Resource[];
    table: Resource[];
  };
  displayName: string;
  tagline: string;
  databaseName?: string;
}

export const commonTables = [Resource.accessLog];

export const linkabilityTables = [
  Resource.collection,
  Resource.property,
  Resource.view,
  Resource.linkTag
];

export const filesAbilityTables = [Resource.file];

export const resourceTableMap: Record<Product, Resource[]> = {
  [Product.NUCLEUM]: [Resource.event],
  [Product.MEMOTRON]: [Resource.node, Resource.capture],
  [Product.POINTRON]: [
    Resource.objective,
    Resource.task,
    Resource.session,
    Resource.sessionLog
  ]
};

export function resolveProductResourceConfig(
  product: Product | string,
  options: { isDev?: boolean } = {}
) {
  const base = productRegistry[product as Product];
  if (!base) return { browse: [], table: [] };
  const browse = [...base.resources.browse];
  if (
    product === Product.NUCLEUM &&
    options.isDev &&
    !browse.includes(Resource.space)
  ) {
    browse.push(Resource.space);
  }
  return {
    browse,
    table: [...base.resources.table]
  };
}

export const productRegistry: Record<Product, IProductConfigBase> = {
  [Product.NUCLEUM]: {
    name: "Nucleum",
    databaseName: "nativeone",
    resources: {
      browse: [Resource.collection, Resource.event],
      table: [
        ...commonTables,
        ...Array.from(Object.values(resourceTableMap)).flat(),
        ...linkabilityTables,
        ...filesAbilityTables,
        Resource.space
      ]
    },
    displayName: "Nucleum",
    tagline: "Your digital harmony"
  },
  [Product.MEMOTRON]: {
    name: "Memotron",
    databaseName: "nativeone",
    resources: {
      browse: [Resource.node, Resource.collection],
      table: [
        ...commonTables,
        ...resourceTableMap[Product.MEMOTRON],
        ...linkabilityTables,
        ...filesAbilityTables
      ]
    },
    displayName: "Memotron",
    tagline: "Your memory partner"
  },
  [Product.POINTRON]: {
    name: "Pointron",
    databaseName: "pointone",
    resources: {
      browse: [
        Resource.objective,
        Resource.task,
        Resource.collection,
        Resource.event
      ],
      table: [
        ...commonTables,
        ...resourceTableMap[Product.POINTRON],
        ...linkabilityTables
      ]
    },
    displayName: "Pointron",
    tagline: "Your focus haven"
  }
};

export const sharedExtensions: Record<Extension, IProductConfigBase> = {
  [Extension.MEMOTRON_CLIPPER]: {
    name: "Memotron Clipper",
    resources: {
      browse: [],
      table: [
        ...commonTables,
        ...resourceTableMap[Product.MEMOTRON],
        ...linkabilityTables,
        ...filesAbilityTables
      ]
    },
    displayName: "Memotron Clipper",
    tagline: ""
  },
  [Extension.MEMOTRON_SHARE]: {
    name: "Memotron Share",
    resources: {
      browse: [],
      table: []
    },
    displayName: "Memotron Share",
    tagline: ""
  }
};
