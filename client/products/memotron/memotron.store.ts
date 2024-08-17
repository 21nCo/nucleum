import { dataManager } from "$lib/client/persistence/dataManager";
import {
  headingNodeTypes,
  LinkType,
  rootNodeTypeList
} from "$lib/client/products/memotron/node/node.type";
import {
  activeResourceFilter,
  interceptSurrealResponse
} from "$lib/client/utils/utils";
import { get } from "svelte/store";
import { resolveResourceTypeFromId } from "./memotron.utils";
import { MemotronResourceType } from "./memotron.type";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { isValidString } from "$lib/shared/utils/text.utils";
import type { IProperty } from "./collection/properties/property.type";
import { CollectionType } from "./collection/collection.type";
import type { IAvatar } from "$lib/client/types/avatar.type";
import { MemotronDexie } from "./memotron.dexie";
import type { ISurrealDatabase } from "$lib/client/types/db.type";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import { type IStore, StoreDataType } from "$lib/client/types/data.type";

/**
 * @deprecated
 * @param typeId
 * @returns
 */
export function resolveAssociatedType(typeId: string) {
  if (!typeId) return null;
  const tb = get(dataManager).cacheSource.dexie.type;
  return tb.get(typeId);
}

export function resolveNodeParent(id: string) {
  const tb = get(dataManager).cacheSource.dexie.node;
  //   return tb.where("children").anyOf(id).toArray();
  return tb
    .filter((node) => node.children && node.children.includes(id))
    .first();
}

export async function resolveNodeParentHierarchy(id: string) {
  const hierarchy = [];
  let traverseComplete = true;
  while (traverseComplete) {
    const parent = await resolveNodeParent(id);
    if (parent) {
      hierarchy.push(parent);
      id = parent.id;
    } else {
      traverseComplete = false;
    }
  }
  return hierarchy.reverse();
}

export async function searchForLinking(query: string) {
  const dexie = get(dataManager).cacheSource.dexie;
  // const nodesPromise = dexie.node
  //   .where("title")
  //   .anyOfIgnoreCase(query)
  //   .toArray()
  //   .then((nodes) => nodes.map((node) => ({ ...node, label: node.title })));
  const nodesPromise = dexie.node
    .filter(activeResourceFilter)
    .filter(
      (node) =>
        (node.label &&
          node.label.toLowerCase().includes(query.toLowerCase())) ||
        (headingNodeTypes.includes(node.contentType) &&
          node.body.toLowerCase().includes(query.toLowerCase())) ||
        false
    )
    .toArray()
    .then((nodes) =>
      nodes.map((node) => ({ ...node, label: node.label ?? node.body }))
    );

  // const collectionsPromise = dexie.curation
  //   .where("label")
  //   .anyOfIgnoreCase(query)
  //   .and((collection) => collection.type === CurationType.COLLECTION)
  //   .toArray();
  const collectionsPromise = dexie.collection
    .filter(activeResourceFilter)
    .filter((collection) =>
      collection.label?.toLowerCase().includes(query.toLowerCase())
    )
    .toArray();
  // return nodesPromise;
  return Promise.all([nodesPromise, collectionsPromise]).then(
    ([nodes, collections]) => nodes.concat(collections)
  );
}

export async function resolveResource(id: string) {
  const resourceType = resolveResourceTypeFromId(id);
  const dexie = get(dataManager).cacheSource.dexie;
  switch (resourceType) {
    case MemotronResourceType.NODE:
      return await dexie.node.get(id);
    case MemotronResourceType.COLLECTION:
      return await dexie.collection.get(id);
    default:
      return null;
  }
}

export class SearchStore {
  resource: Resource = Resource.everything;
  searchQuery: string = "";
  isStarFilterSelected: boolean = false;
  dexie: MemotronDexie;
  constructor(resource: Resource = Resource.everything) {
    this.resource = resource;
    this.dexie = get(dataManager).cacheSource.dexie;
  }
  levenshteinDistance(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  async refreshNodes() {
    let query = this.dexie.node
      .where("contentType")
      .anyOfIgnoreCase(
        this.searchQuery
          ? [...rootNodeTypeList, ...headingNodeTypes]
          : rootNodeTypeList
      );

    if (this.resource === Resource.archived) {
      query = query.and((item) => item.isArchived === true);
    } else {
      query = query.and((node) => activeResourceFilter(node));
    }

    if (this.isStarFilterSelected) {
      query = query.and((item) => item.isStarred === true);
    }
    if (this.searchQuery) {
      query = query.and(
        (item) =>
          item.label?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          ("body" in item &&
            typeof item.body === "string" &&
            item.body?.toLowerCase().includes(this.searchQuery.toLowerCase()))
      );
    }
    return query.toArray();
  }

  async refreshCollections() {
    let query = this.dexie.collection.where("id").notEqual("");

    if (this.resource === Resource.archived) {
      query = query.and((item) => item.isArchived === true);
    } else {
      query = query.and((node) => activeResourceFilter(node));
    }

    if (this.isStarFilterSelected) {
      query = query.and((item) => item.isStarred === true);
    }

    if (isValidString(this.searchQuery)) {
      query = query.filter((collection) => {
        if (!collection.label) return false;
        const labelValue = collection.label.toLowerCase();
        const searchValue = this.searchQuery.toLowerCase();
        if (labelValue.includes(searchValue)) return true;
        const levenshteinDistanceValue = this.levenshteinDistance(
          labelValue,
          searchValue
        );
        console.log({ labelValue, searchValue, levenshteinDistanceValue });
        return levenshteinDistanceValue <= 2;
      });
    }
    return query.toArray();
  }

  async refresh(params: {
    resource?: Resource;
    searchQuery?: string;
    isStarFilterSelected?: boolean;
  }) {
    this.resource = params.resource ?? this.resource;
    this.searchQuery = params.searchQuery ?? this.searchQuery;
    this.isStarFilterSelected =
      params.isStarFilterSelected != undefined
        ? params.isStarFilterSelected
        : this.isStarFilterSelected;
    // let data: any[] = [];
    let data: any;
    if (
      this.resource === Resource.everything ||
      this.resource === Resource.archived
    ) {
      const nodes = await this.refreshNodes();
      const collections = await this.refreshCollections();
      data = [...nodes, ...(collections ?? [])];
    } else if (this.resource === Resource.node) {
      data = await this.refreshNodes();
    } else if (this.resource === Resource.collection) {
      data = (await this.refreshCollections()) ?? [];
    }
    //TODO - use sort from library state settings
    //.reverse().sortBy("interactedAt");
    return data.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  private recentNodes() {
    return this.dexie.node
      .where("contentType")
      .anyOfIgnoreCase([...rootNodeTypeList, ...headingNodeTypes])
      .and((item: any) => activeResourceFilter(item))
      .toArray();
  }
  private recentCollections() {
    return this.dexie.collection
      .where("id")
      .notEqual("")
      .and((item: any) => activeResourceFilter(item))
      .toArray();
  }

  async recents(resource: Resource) {
    this.resource = resource ?? this.resource;
    let data: any[] = [];
    if (
      this.resource === Resource.everything ||
      this.resource === Resource.archived
    ) {
      const nodes = await this.recentNodes();
      const collections = await this.recentCollections();
      // console.log({ nodes, collections });
      data = [...nodes, ...(collections ?? [])];
      // data = [...nodes, ...(collections ?? [])].sort(
      //   (a, b) => b.interactedAt - a.interactedAt
      // );
    } else if (this.resource === Resource.node) {
      data = await this.recentNodes();
    } else if (this.resource === Resource.collection) {
      data = (await this.recentCollections()) ?? [];
    }
    return data;
  }
}

export async function resolveTypes(collections: string[]) {
  let types: string[] = [];
  let propertyConfig: IProperty[] = [];
  let avatars: IAvatar[] = [];
  if (!collections) return { types, propertyConfig, avatars };
  const dexie = get(dataManager).cacheSource.dexie;
  const typeCollectionLinks = await dexie.collection
    .where("id")
    .anyOfIgnoreCase(collections)
    .and((collection) => collection.type === CollectionType.TYPED)
    .toArray();
  if (!typeCollectionLinks || typeCollectionLinks.length == 0)
    return { types, propertyConfig, avatars };
  types = typeCollectionLinks.map((type) => type.id);
  let allProperties: string[] = [];
  typeCollectionLinks.map((type) => {
    allProperties = [...allProperties, ...(type.properties ?? [])];
  });
  avatars =
    typeCollectionLinks.map((type) => type.avatar).filter((x) => x) ?? [];
  propertyConfig = await dexie.property
    .where("id")
    .anyOfIgnoreCase(allProperties)
    .filter(activeResourceFilter)
    .toArray();
  return { types, propertyConfig, avatars };
}

class Linker implements IStore {
  id: string = "linker";
  dataType: StoreDataType = StoreDataType.NA;
  db: ISurrealDatabase;
  dboDependencies: string[] = ["fn::memotron::link", "fn::memotron::unlink"];
  constructor() {
    this.db = new SurrealDatabase();
  }
  async link(from: string, to: string, linkType: LinkType = LinkType.DIRECT) {
    let response = await this.db.query(
      "return fn::memotron::link($from, $to, $linkType);",
      {
        from,
        to,
        linkType
      }
    );
    return interceptSurrealResponse(response, "link");
  }
  async unlink(from: string, to: string) {
    let response = await this.db.query(
      "DELETE $from->link where out=$to; DELETE $to->link where out=$from;",
      {
        from,
        to
      }
    );
    return interceptSurrealResponse(response, "unlink");
  }
  get() {}
}

export const linker = new Linker();
