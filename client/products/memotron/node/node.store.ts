import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  LinkType,
  type IActiveNode,
  type INodeProperty,
  type INode,
  NodeType,
  NodeRightPaneType,
  type INodeLink
} from "$lib/client/products/memotron/node/node.type";
import {
  activeResources,
  ActiveResourceStore,
  ResourceStore
} from "$lib/client/components/flux/resourceStores/resource.store";
import { debouncer } from "$lib/client/utils/utils";
import { formatDate } from "$lib/client/utils/time.utils";
import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
import { ResourceActions } from "../common/resource.actions";
import { MemotronAction } from "../memotronAction.enum";
import { appStore } from "$lib/client/stores/app.store";
import { writable } from "svelte/store";
import { linker } from "../memotron.store";
import type { IContextMenu } from "$lib/client/types/select.type";
import { flux } from "$lib/client/components/flux/flux";
import { logger } from "$lib/client/components/debug/logger.client";
import { collectionStore } from "../collection/collection.store";
import type { IRecordId } from "$lib/client/types/data.type";
import type { IToggleItem } from "$lib/client/elements/toggle/toggle.type";
import { generateMarkdownText } from "./node.utils";

export const hierarchyFactorLimit = 5;

class NodeStore extends ResourceStore<INode> {
  constructor() {
    super(Resource.node, {
      refreshOnAppear: true,
      dboDependencies: [
        "fn::memotron::node::fetch",
        "fn::memotron::timeline",
        "fn::memotron::pdfAnnotator::getAllClips",
        "fn::memotron::pdfAnnotator::saveClip"
      ]
    });
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
}

export const nodeStore = new NodeStore();

export type IActiveNodeStore = InstanceType<typeof ActiveNodeStore>;

/**
 * Node store map for individual nodes that are open in the UI.
 */
const activeNodeStores = new Map<string, IActiveNodeStore>();

/**
 * Resolves the active node store for the given id. If the store does not exist, it will be initialized.
 * @param id - The id of the node
 * @param context - The context from which the store is being accessed. This is used for debugging purposes.
 * @returns The active node store
 */
export function resolveActiveNodeStore(id: string, context: string = "") {
  if (!activeResources.has(id)) {
    //console.log("init node store from: " + context + " id: " + id);
    // activeNodeStores.set(id, initActiveNodeStore(id));
    activeResources.set(id, new ActiveNodeStore(id));
  }
  let val = activeResources.get(id);
  return val!;
}

class ActiveNodeStore extends ActiveResourceStore<IActiveNode, NodeStore> {
  eventStore: any;
  constructor(node: string) {
    super(node, nodeStore);
    this.eventStore = resolveActiveNodeEventStore(node);
  }
  debouncers = new Map<string, any>();
  updateBlockPropagator = (
    id: string,
    mutationId: string,
    changedProps: { body?: string; children?: string[] }
  ) => {
    if (changedProps.children) {
      const node = this.get();
      const childrenNodes = node.md.blocks.filter(
        (x) =>
          x.id &&
          changedProps.children
            ?.map((x) => x.toString())
            ?.includes(x.id.toString())
      );
      const mdText = generateMarkdownText(childrenNodes);
      return this.resourceStore.modify(id, { ...changedProps, mdText });
    }
    this.resourceStore.modify(id, changedProps);
  };
  resolveDebouncerForBlockPersistance(id: string) {
    if (!this.debouncers.has(id)) {
      this.debouncers.set(id, debouncer(this.updateBlockPropagator, 2000));
    }
    let val = this.debouncers.get(id);
    return val!;
  }
  fetch = async () => {
    const node = await this.resourceStore.fetch(this.id);
    if (node) {
      this.set(node);
    }
    const rawLinks =
      node.links.length > 0 ? node.links : [...node.outlinks, ...node.inlinks];
    const links: INodeLink[] = rawLinks
      .filter((x) => {
        return (
          (x.in.toString() === this.id && x.out.tb === Resource.node) ||
          (x.out.toString() === this.id && x.in.tb === Resource.node)
        );
      })
      .map((x) => {
        const id = x.in.toString() === this.id ? x.out : x.in;
        return {
          id,
          linkType: x.linkType
        };
      });
    const collections: IRecordId[] = rawLinks
      .filter(
        (x) =>
          x.out.tb === Resource.collection || x.in.tb === Resource.collection
      )
      .map((x) => (x.out.tb === Resource.collection ? x.out : x.in));
    logger.log({ at: "ActiveNodeStore.fetch", rawLinks, links, collections });
    const { types, propertyConfig, avatars } =
      await collectionStore.resolveTypes(collections);
    this.update((n) => {
      n.types = types;
      n.propertyConfig = propertyConfig;
      n.avatars = avatars;
      n.links = links;
      n.collections = collections;
      return n;
    });
  };
  updateProperties = async (properties: INodeProperty[]) => {
    this.update((prev) => ({ ...prev, properties }));
    return this.resourceStore.modify(this.id, { properties });
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
    id: string,
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
  if (
    (accessPoint === ResourceAccessPoint.NODE_LINKS ||
      accessPoint === ResourceAccessPoint.NODE_DEFAULT_RIGHT_PANE) &&
    params?.accessPointId
  ) {
    let baseItems = [resourceActions.pinToTopBar(), resourceActions.copyLink()];
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
          resourceActions.select(accessPoint),
          resourceActions.pinToTopBar(),
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
          resourceActions.pinToTopBar(),
          resourceActions.copyLink(),
          {
            value: "download",
            icon: "download",
            callback: async () => {}
          },
          {
            value: "share",
            icon: "share",
            callback: async () => {}
          }
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
        resourceActions.edit(accessPoint),
        resourceActions.pinToTopBar(),
        resourceActions.copyLink(),
        {
          value: "export",
          icon: "share",
          callback: async () => {}
        },
        {
          value: "share",
          icon: "share",
          callback: async () => {
            appStore.runAction(MemotronAction.PUBLISH, {
              componentParams: { id: node.id }
            });
          }
        },
        {
          value: "history",
          icon: "history",
          callback: async () => {}
        }
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
        icon: "ph:fork-knife-thin",
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
    },
    {
      value: "bird",
      icon: "ph:bird-thin",
      tooltip: "Bird view"
    }
  ];
  if (contentType === NodeType.PDF || contentType === NodeType.WEB_PAGE) {
    baseActions.unshift({
      value: NodeRightPaneType.TRACES,
      icon: "bookmark",
      tooltip: "Show traces"
    });
  }
  return baseActions;
}
