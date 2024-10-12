import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  LinkType,
  type IActiveNode,
  type INodePropertyValue,
  type INode,
  NodeType,
  NodeRightPaneType,
  type INodeLinkThumb,
  type INodeLink,
  canHaveTraces
} from "$lib/client/products/memotron/node/node.type";
import {
  activeResources,
  ActiveResourceStore,
  ResourceStore
} from "$lib/client/components/flux/resourceStores/resource.store";
import { debouncer } from "$lib/client/utils/utils";
import { formatDate } from "$lib/client/utils/time.utils";
import {
  ResourceAccessMode,
  ResourceAccessPoint
} from "$lib/client/components/flux/resourceStores/resource.type";
import { ResourceActions } from "../common/resource.actions";
import { MemotronAction } from "../memotronAction.enum";
import { appStore } from "$lib/client/stores/app.store";
import { writable } from "svelte/store";
import { SearchStore } from "../memotron.store";
import { linker } from "$lib/client/products/memotron/linking/link.store";
import type { IContextMenu } from "$lib/client/types/select.type";
import { flux } from "$lib/client/components/flux/flux";
import { logger } from "$lib/client/components/debug/logger.client";
import { collectionStore } from "../collection/collection.store";
import type { IRecordId } from "$lib/client/types/data.type";
import type { IToggleItem } from "$lib/client/elements/toggle/toggle.type";
import { generateMarkdownText } from "./node.utils";
import { isValidString } from "$lib/shared/utils/text.utils";
import {
  resourceInList,
  isSameResource
} from "$lib/client/components/flux/resourceStores/resource.utils";
import { FeatureExtractor } from "$lib/client/utils/taco.utils";

export const hierarchyFactorLimit = 5;

class NodeStore extends ResourceStore<INode> {
  searchStore: SearchStore;
  constructor() {
    super(Resource.node, {
      dboDependencies: ["fn::memotron::node::fetch", "fn::memotron::timeline"]
    });
    this.searchStore = new SearchStore(Resource.node);
  }
  async fetchTimeline(date: Date) {
    const query = `fn::memotron::timeline($date)`;
    const response = await flux.selectByQuery(query, {
      date: formatDate(date, "iso")
    });
    logger.log({ at: "fetch timeline", response });
    return response;
  }

  /**
   *
   *
   * Note: sending nodeId as param with $nodeId placeholder is not working in case of surreal.js + wasm engine. It is not detecting it as record id. Sending the fn param without single quotes is working.
   *
   * @param nodeId
   * @returns
   */
  async fetch(nodeId: IRecordId) {
    const query = `fn::memotron::node::fetch(${nodeId})`;
    const response = await flux.selectByQuery(query);
    logger.log({ at: "fetch node", response });
    return response;
  }

  async search(query: string) {
    if (isValidString(query)) {
      this.searchStore.searchQuery = query;
      return this.searchStore.nodes();
    } else {
      return this.searchStore.recents();
    }
  }
}

export const nodeStore = new NodeStore();

export const vectorResourceStore = new ResourceStore(Resource.vector);

export type IActiveNodeStore = InstanceType<typeof ActiveNodeStore>;

/**
 *
 * @deprecated - use ActiveNodeStore.resolve instead
 *
 * Resolves the active node store for the given id. If the store does not exist, it will be initialized.
 * @param id - The id of the node
 * @param context - The context from which the store is being accessed. This is used for debugging purposes.
 * @returns The active node store
 */
export function resolveActiveNodeStore(id: IRecordId, context: string = "") {
  const idStr = id.toString();
  if (!activeResources.has(idStr)) {
    activeResources.set(idStr, new ActiveNodeStore(id));
  }
  let val = activeResources.get(idStr);
  return val!;
}

export class ActiveNodeStore extends ActiveResourceStore<
  IActiveNode,
  NodeStore
> {
  eventStore: any;
  debouncers = new Map<string, any>();
  constructor(node: IRecordId) {
    super(node, nodeStore);
    this.eventStore = resolveActiveNodeEventStore(node.toString());
  }
  updateBlockPropagator = async (
    id: string,
    mutationId: string,
    changedProps: { body?: string; children?: string[] }
  ) => {
    console.log("updateBlockPropagator", id, changedProps);
    if (changedProps.children) {
      const node = this.get();
      console.log("updateBlockPropagator node", id, node, node.id);
      const childrenNodes = node.md.blocks.filter(
        (x) => x.id && changedProps.children?.some(resourceInList(x.id))
      );
      const mdText = generateMarkdownText(childrenNodes);
      // const embedding = await FeatureExtractor.generateVectorEmbeddings(mdText);
      let params = { filters: { node: node.id.toString() } };
      // {
      //   whereClause: `node.id=${node.id}`
      // };
      // let vectorResult = await vectorResourceStore.selectMany(params);
      // const vectorUpdateresult = await vectorResourceStore.modify(
      //   vectorResult?.[0].id,
      //   {
      //     embedding: embedding
      //   }
      // );
      return this.resourceStore.modify(id, { ...changedProps, mdText });
    }
    this.resourceStore.modify(id, changedProps);
  };
  resolveDebouncerForBlockPersistance(id: string) {
    if (!this.debouncers?.has(id)) {
      this.debouncers.set(id, debouncer(this.updateBlockPropagator, 2000));
    }
    let val = this.debouncers.get(id);
    return val!;
  }
  init = async (accessMode: ResourceAccessMode) => {
    const node = await this.resourceStore.fetch(this.id);
    if (node) {
      if (
        node.contentType === NodeType.YOUTUBE_VIDEO &&
        node.clips &&
        Array.isArray(node.clips)
      ) {
        node.clips.sort((a, b) => a.body.timestamp - b.body.timestamp);
      }
      this.set({ ...node, accessMode });
    }

    const rawLinks =
      node.links.length > 0 ? node.links : [...node.outlinks, ...node.inlinks];
    const links: INodeLinkThumb[] = rawLinks
      .filter((x: INodeLink) => {
        return (
          (x.in.toString() === this.id && x.out.tb === Resource.node) ||
          (x.out.toString() === this.id && x.in.tb === Resource.node)
        );
      })
      .map((x: INodeLink) => {
        const id = x.in.toString() === this.id ? x.out : x.in;
        return {
          linkedTo: id,
          linkType: x.linkType,
          id: x.id,
          tags: x.tags
        } as INodeLinkThumb;
      });
    const collections: IRecordId[] = rawLinks
      .filter(
        (x: INodeLink) =>
          x.out.tb === Resource.collection || x.in.tb === Resource.collection
      )
      .map((x: INodeLink) => (x.out.tb === Resource.collection ? x.out : x.in));
    logger.log({
      at: "ActiveNodeStore.fetch",
      node,
      rawLinks,
      links,
      collections
    });
    const types = await collectionStore.resolveTypes(collections);
    this.update((n) => {
      n.types = types;
      n.links = links;
      n.collections = collections;
      return n;
    });
  };
  updateProperty = async (property: INodePropertyValue) => {
    let properties = this.get().properties ?? [];
    properties = properties.filter((x) => !isSameResource(x, property));
    this.update((prev) => ({ ...prev, properties: [...properties, property] }));
    return this.resourceStore.modify(
      this.id,
      {
        properties: [...properties, property]
      },
      {
        isDebounced: true,
        debounceKey: "property" + property.id.toString()
      }
    );
  };

  updateBlock = (id: IRecordId, changedProps: any) => {
    const mutationId =
      `${id.toString()}-` +
      ("children" in changedProps
        ? "children"
        : "contentType" in changedProps
          ? "contentType"
          : "body" in changedProps
            ? "body"
            : "block");
    const debouncer = this.resolveDebouncerForBlockPersistance(mutationId);
    debouncer(id, mutationId, changedProps);
  };

  createBlock = async (
    id: IRecordId,
    contentType: any,
    params?: { body?: any }
  ) => {
    logger.log({ at: "ActiveNodeStore.createBlock", id, contentType, params });
    return this.resourceStore.create([
      {
        id,
        contentType,
        creationContext: this.id,
        body: params?.body
      }
    ]);
  };
  deleteBlock = async (id: string) => {
    return this.resourceStore.trash(id);
  };
  mention = async (location: string, id: string) => {
    return linker.link(location, id, LinkType.MENTION);
  };

  private async refreshTypes() {
    const collections = this.get().collections;
    if (!collections || collections.length === 0) {
      this.update((n) => ({ ...n, types: [] }));
      return;
    }
    const types = await collectionStore.resolveTypes(collections);
    this.update((n) => ({ ...n, types }));
  }

  async linkCollection(id: IRecordId) {
    const result = await linker.link(this.id, id);
    if (result) {
      this.update((n) => ({
        ...n,
        collections: [...(n.collections ?? []), id]
      }));
      await this.refreshTypes();
    }
    return result;
  }

  async unlinkCollection(id: IRecordId) {
    const node = this.get();
    await linker.unlink(node.id, id);
    this.update((n) => ({
      ...n,
      collections: n.collections?.filter((x) => !isSameResource(x, id))
    }));
    await this.refreshTypes();
  }

  /**
   * Sets the focused block and parent for the focused block.
   *
   * This is triggered in both the cases of focusing from markdown and breadcrumbs.
   *
   * @param id
   * @param parent
   */
  onFocus(id: string, parent: string[]) {
    this.update((n) => {
      n.focusedBlock = id;
      n.parent = [...parent, id];
      return n;
    });
  }
  unFocus() {
    this.update((n) => {
      n.focusedBlock = undefined;
      n.parent = [];
      return n;
    });
  }

  /**
   * @deprecated - fetching directly in node.fetch
   * @returns
   */
  async fetchLinks() {
    const node = this.get();
    let id = node.id;
    if (node.focusedBlock) id = node.focusedBlock;
    const query = `BEGIN TRANSACTION; let $to = array::first(select value ->link.* from node where id is $id); 
    let $from = array::first(select value <-link.* from node where id is $id);
   return {from: $from, to: $to};
    COMMIT TRANSACTION;`;
    const response = await flux.selectByQuery(query, {
      id
    });
    logger.log({ at: "ActiveNodeStore.resolveLinks", response });
    return response;
  }
}

const activeNodeEventStores = new Map<string, any>();

export function resolveActiveNodeEventStore(id: string) {
  if (!activeNodeEventStores.has(id)) {
    activeNodeEventStores.set(id, initActiveNodeEventStore(id));
  }
  let val = activeNodeEventStores.get(id);
  return val!;
}

/**
 * Node event store is used as a sub store in active node store to communicate between remote node UI components like in the case of click events from breadcrumbs to relay it to the markdown component.
 * @param id
 * @returns
 */
function initActiveNodeEventStore(id: string) {
  const { subscribe, set, update } = writable<
    { event: MouseEvent; id: string } | undefined
  >();
  return {
    subscribe,
    set,
    update,
    reset: () => {
      set(undefined);
    }
  };
}

export function resolveNodeContextMenu(
  node: INode,
  accessPoint: ResourceAccessPoint,
  params?: {
    isMediaNode?: boolean;
    accessPointId?: IRecordId;
  }
): IContextMenu {
  const resourceActions = new ResourceActions(node, nodeStore);
  if (accessPoint === ResourceAccessPoint.NODE_LINKS && params?.accessPointId) {
    let baseItems = [resourceActions.openAsTab(), resourceActions.copyLink()];
    if (accessPoint === ResourceAccessPoint.NODE_LINKS) {
      baseItems.unshift(
        resourceActions.select(accessPoint, params?.accessPointId)
      );
      baseItems.unshift(resourceActions.unlink(params?.accessPointId));
    }
    return [
      {
        group: "all",
        items: [...baseItems]
      },
      {
        group: "more",
        items: [resourceActions.trash()]
      }
    ];
  } else if (accessPoint != ResourceAccessPoint.SELF) {
    return [
      {
        group: "all",
        items: [
          resourceActions.star(),
          resourceActions.edit(accessPoint),
          // resourceActions.select(accessPoint),
          resourceActions.openAsTab(),
          resourceActions.copyLink()
        ]
      },
      {
        group: "more",
        items: [resourceActions.archive(), resourceActions.trash()]
      }
    ];
  } else if (params?.isMediaNode) {
    return [
      {
        group: "all",
        items: [
          resourceActions.star(),
          resourceActions.edit(accessPoint),
          resourceActions.openAsTab(),
          {
            value: NodeRightPaneType.METADATA,
            icon: "ph:file-thin"
          },
          resourceActions.copyLink()
          // {
          //   value: "download",
          //   icon: "download",
          //   callback: async () => {}
          // },
          // {
          //   value: "share",
          //   icon: "share",
          //   callback: async () => {}
          // }
        ]
      },
      {
        group: "more",
        items: [resourceActions.archive(), resourceActions.trash()]
      }
    ];
  }
  return [
    {
      group: "all",
      items: [
        resourceActions.star(),
        // resourceActions.edit(accessPoint),
        resourceActions.openAsTab(),
        {
          value: NodeRightPaneType.METADATA,
          icon: "ph:file-thin"
        },
        {
          value: NodeRightPaneType.HISTORY,
          icon: "ph:clock-countdown-thin",
          label: "Show history"
        }
      ]
    },
    {
      group: "shareAndExport",
      items: [
        resourceActions.copyLink()
        // {
        //   value: "export",
        //   icon: "share",
        //   callback: async () => {}
        // },
        // {
        //   value: "share",
        //   icon: "share",
        //   callback: async () => {
        //     appStore.runAction(MemotronAction.PUBLISH, {
        //       componentParams: { id: node.id }
        //     });
        //   }
        // }
      ]
    },
    {
      group: "more",
      items: [resourceActions.archive(), resourceActions.trash()]
    }
  ];
}

export function resolveVisibleActions(contentType: NodeType): IToggleItem[] {
  if (contentType === NodeType.NODULAR_MARKDOWN) {
    return [
      {
        value: NodeRightPaneType.SIDENOTES,
        icon: "ph:note-thin",
        tooltip: "Side notes"
      },
      {
        value: "readMode",
        icon: "ph:book-open-thin",
        tooltip: "Toggle read mode"
      },
      {
        value: "forks",
        icon: "ph:git-fork-thin",
        tooltip: "Show forks"
      }
    ];
  }
  const baseActions: IToggleItem[] = [
    {
      value: NodeRightPaneType.SIDENOTES,
      icon: "ph:note-thin",
      tooltip: "Side notes"
    },
    {
      value: NodeRightPaneType.LINKS,
      icon: "ph:arrows-left-right-thin",
      tooltip: "Show links"
    },
    {
      value: NodeRightPaneType.PROPERTIES,
      icon: "widget",
      tooltip: "Show properties"
    }
    // {
    //   value: "bird",
    //   icon: "ph:bird-thin",
    //   tooltip: "Bird view"
    // }
  ];
  if (canHaveTraces.includes(contentType)) {
    baseActions.unshift({
      value: NodeRightPaneType.TRACES,
      icon: "bookmark",
      tooltip: "Show traces"
    });
  }
  return baseActions;
}
