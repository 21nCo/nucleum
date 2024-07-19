import { dataManager } from "$lib/client/persistence/dataManager";
import { CurationType } from "$lib/client/types/memotron/curation.type";
import { headingNodeTypes } from "$lib/client/types/memotron/node.type";
import { activeResourceFilter } from "$lib/client/utils/utils";
import { get } from "svelte/store";

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
  const dexie = get(dataManager).cacheSource.dexie;
  const node = await dexie.node.get(id);
  if (node) return node;
  return dexie.curation.get(id);
}
