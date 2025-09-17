import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { LinkType } from "$lib/client/products/memotron/linking/link.type";
import {
  type IActiveNode,
  type INode,
  NodeType,
  NodeRightPaneType,
  type INodeLinkThumb,
  canHaveTraces,
  NodeView,
  headingNodeTypes,
  mediaNodeTypeList,
  rootNodeTypeList,
  type INodeCapture
} from "$lib/client/products/memotron/node/node.type";
import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import {
  activeResourceFilterIgnoreParentInactive,
  debouncer
} from "$lib/client/utils/utils";
import {
  ResourceAccessMode,
  ResourceAccessPoint,
  ResourceActionType
} from "$lib/client/components/flux/resourceStores/resource.type";
import { ResourceActions } from "$lib/client/components/record/resource.actions";
import { get, writable } from "svelte/store";
import { linker } from "$lib/client/products/memotron/linking/link.store";
import {
  ContextMenuType,
  type IContextMenu,
  type IContextMenuItem
} from "$lib/client/types/select.type";
import { flux } from "$lib/client/components/flux/flux";
import { logger } from "$lib/client/components/debug/logger.client";
import { collectionStore } from "$lib/client/components/collection/collection.store";
import type {
  IRecordId,
  IResourceSelectAdditionalParams,
  IResourceSelectParams
} from "$lib/client/types/data.type";
import type { IToggleItem } from "$lib/client/elements/toggle/toggle.type";
import { generateMarkdownText, getMarkdownSymbolPrepended } from "./node.utils";
import { isValidString } from "$lib/shared/utils/text.utils";
import {
  resourceInList,
  isSameResource,
  isRecordId
} from "$lib/client/components/flux/resourceStores/resource.utils";

import context from "$lib/client/stores/context.store";
import { Embed } from "$lib/client/types/context.type";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import { fileStore } from "$lib/client/components/files/file.store";
import { recursivelyExtractAllChildrenIntoArray } from "$lib/client/components/markdown/markdown.utils";
import view from "$lib/client/stores/view.store";
import { CollectibleStore } from "$lib/client/components/collection/collectible.store";
import { appStore } from "$lib/client/stores/app.store";
import type { ILink } from "../linking/link.type";

export const hierarchyFactorLimit = 5;
const defaults: Partial<INode> = {
  metaType: "",
  contentType: NodeType.UNKNOWN
};
class NodeStore extends ResourceStore<INode, INodeCapture<INode>> {
  searchStore: any;
  constructor() {
    super(Resource.node, {
      indices: ["contentType", "metaType", "parent"],
      searchIndices: ["label", "text", "notes"],
      expandProps: ["parent", "file", "mdParent"],
      defaultProps: defaults
    });
  }

  selectMany(
    params?: IResourceSelectParams,
    additionalParams?: IResourceSelectAdditionalParams
  ) {
    const expandedProps = [
      "*",
      "parent.* as parent",
      "file.* as file",
      "(select * from $parent.mdParent) as mdParent",
      "search::highlight('**', '**', 2, false) AS bodySearch"
    ];
    if (additionalParams?.isQueryAsIs) {
      return super.selectMany(
        {
          ...(params ?? {})
        },
        additionalParams
      );
    }
    const isContentTypePresent =
      params?.filters &&
      "contentType" in params?.filters &&
      params.filters.contentType;
    const isMetaTypePresent =
      params?.filters &&
      "metaType" in params?.filters &&
      params.filters.metaType;
    const isIdPresent =
      params?.filters && "id" in params?.filters && params?.filters?.id;
    const filters = {
      creationContext:
        isValidString(params?.search?.query) ||
        isContentTypePresent ||
        isIdPresent
          ? undefined
          : false,
      metaType:
        isValidString(params?.search?.query) ||
        isMetaTypePresent ||
        isIdPresent ||
        additionalParams?.isIncludeMetaItems
          ? undefined
          : false,
      ...(params?.filters ?? {}),
      contentType: isContentTypePresent
        ? resolveContentTypeParam(params?.filters?.contentType)
        : params?.search?.query || isIdPresent
          ? undefined
          : rootNodeTypeList
    };
    params = {
      ...(params ?? {}),
      filters
    };
    return super.selectMany(params, additionalParams);

    function resolveContentTypeParam(contentType: string | Array<string>) {
      if (typeof contentType === "string") {
        return contentType.toUpperCase();
      }
      return contentType;
    }
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
    // const query = `fn::memotron::node::fetch(${nodeId})`;
    // const response = await flux.selectByQuery(query);
    const oldProps = [
      "*",
      "parent.* as parent",
      "file.* as file",
      "(fn::memotron::node::children($parent.children)) as children"
    ];
    const response = await super.select(nodeId, {
      expand: ["parent", "file"],
      recurse: "children"
    });
    logger.debug({ at: "fetch node", response });
    return response;
  }

  /**
   * @deprecated
   * @param query
   * @returns
   */
  async search(query: string) {
    if (isValidString(query)) {
      this.searchStore.searchQuery = query;
      return this.searchStore.nodes();
    } else {
      return this.searchStore.recents();
    }
  }

  async download(node: IRecordId | INode) {
    let file;
    if (isRecordId(node)) {
      const result = await this.select(node as IRecordId);
      if (result?.file) {
        file = result.file;
      }
    } else if (typeof node === "object" && "file" in node) {
      file = node.file;
    }
    if (file) {
      return fileStore.download(file);
    }
  }

  private async resolveDependencies(ids: IRecordId[]) {
    const childrenResult = await super.selectMany(
      {
        properties: {
          select: ["id"]
        },
        filters: {
          parent: ids.map((id) => id.toString())
        }
      },
      {
        isIncludeInactiveItems: true
      }
    );

    const mdChildrenResult = await Promise.all([
      ...ids.map((id) =>
        super.selectMany(
          {
            properties: {
              select: ["id"]
            },
            filters: {
              parent: {
                contains: id.toString()
              }
            }
          },
          {
            isIncludeInactiveItems: true
          }
        )
      )
    ]);
    return [...(childrenResult ?? []), ...(mdChildrenResult ?? [])];
  }

  private async onParentChange(ids: IRecordId[], status: boolean) {
    try {
      const children = await this.resolveDependencies(ids);
      if (!children || children.length === 0) return;
      const childrenIds = children.map((g: INode) => g.id)?.filter(Boolean);
      if (!childrenIds || childrenIds.length === 0) return;
      await this.bulkModify(childrenIds, { isParentInactive: status });
    } catch (e) {
      logger.error({ at: "onParentChange - node store", error: e });
    }
  }

  async onArchive(ids: IRecordId[]) {
    return this.onParentChange(ids, true);
  }

  async onUnarchive(ids: IRecordId[]) {
    return this.onParentChange(ids, false);
  }

  async onTrash(ids: IRecordId[]) {
    return this.onParentChange(ids, true);
  }

  async onRestore(ids: IRecordId[]) {
    return this.onParentChange(ids, false);
  }
}

export const nodeStore = new NodeStore();

export const vectorResourceStore = new ResourceStore(Resource.vector, {
  isCloudOnlyResource: true
});

export type IActiveNodeStore = InstanceType<typeof ActiveNodeStore>;

export class ActiveNodeStore extends CollectibleStore<
  INode,
  NodeStore,
  IActiveNode
> {
  eventStore: any;
  debouncers = new Map<string, any>();
  constructor(node: IRecordId) {
    super(node, nodeStore);
    this.eventStore = resolveActiveNodeEventStore(node.toString());
  }

  /**
   *
   * For changes to children structure - using isModifyAsSystem: true in additionalParams - since when structure changes are happeneing - currently structure is being updated for all heading nodes in the markdown and therefore all of the heading nodes are being perceived as recents in recentStore due to modifiedAt being updated.
   *
   * @param id
   * @param changedProps
   * @returns
   */
  updateBlockPropagator = async (
    id: IRecordId,
    changedProps: { body?: string; children?: string[] }
  ) => {
    logger.log({
      at: "ActiveNodeStore.updateBlockPropagator",
      changedProps,
      id: id.toString()
    });
    if (changedProps.children) {
      const node = this.get();
      const childrenNodes = node.md.blocks.filter(
        (x) => x.id && changedProps.children?.some(resourceInList(x.id))
      );

      const currentNode = await nodeStore.select(id);
      let parentValue;
      if (currentNode.contentType == NodeType.NODULAR_MARKDOWN)
        parentValue = currentNode.label ?? currentNode.body;
      else parentValue = getMarkdownSymbolPrepended(currentNode);
      const mdText = generateMarkdownText(childrenNodes);
      logger.log({
        at: "ActiveNodeStore.updateBlockPropagator - end",
        changedProps,
        mdText,
        id: id.toString()
      });
      return this.resourceStore.modify(
        id,
        { ...changedProps, text: mdText },
        {
          isPreventBackPropagation: true,
          isModifyAsSystem: true
        }
      );
    }
    this.resourceStore.modify(id, changedProps);
  };
  resolveDebouncerForBlockPersistance(id: string) {
    if (!this.debouncers?.has(id)) {
      this.debouncers.set(id, debouncer(this.updateBlockPropagator, 500));
    }
    let val = this.debouncers.get(id);
    return val!;
  }
  init = async (params: {
    accessMode: ResourceAccessMode;
    accessPoint: ResourceAccessPoint;
  }) => {
    logger.log({ at: "ActiveNodeStore.init", id: this.id });
    console.time("ActiveNodeStore.init");
    try {
      console.time("ActiveNodeStore.init.fetch");
      const node = await this.resourceStore.fetch(this.id);
      console.timeEnd("ActiveNodeStore.init.fetch");
      if (!node || !node.id) {
        return {
          error: "Node not found"
        };
      }
      this.set({ ...node, accessMode: params.accessMode });
      if (
        params.accessPoint === ResourceAccessPoint.CALENDAR ||
        !node.metaType
      ) {
        appStore.addToRecents({
          record: node,
          type: Resource.node,
          timestamp: new Date()
        });
      }
      let blocks: INode[] = [];
      if (
        node.contentType === NodeType.NODULAR_MARKDOWN ||
        headingNodeTypes.includes(node.contentType)
      ) {
        blocks = recursivelyExtractAllChildrenIntoArray(node) as INode[];
      }
      if (blocks.some((x) => !x?.id)) {
        return {
          error: "Node has invalid blocks"
        };
      }
      let types: any[] = [];
      if (params.accessPoint !== ResourceAccessPoint.CALENDAR) {
        types = await collectionStore.resolveTypes(node.collections ?? []);
      }
      this.update((n) => {
        n.types = types;
        n.blocks = blocks;
        return n;
      });
      console.timeEnd("ActiveNodeStore.init");
    } catch (e) {
      logger.error({ at: "node.store fetch", e });
    }
  };

  afterInit = async () => {
    try {
      const node = this.get();
      console.time("ActiveNodeStore.afterInit - links");
      const inLinks = await linker.selectMany({
        filters: {
          in: this.id.toString()
        }
      });
      const outLinks = await linker.selectMany({
        filters: {
          out: this.id.toString()
        }
      });
      const linksResult = [...(inLinks ?? []), ...(outLinks ?? [])].filter(
        (x: ILink) => {
          return (
            (x.in.toString() === this.id &&
              x.out.toString()?.includes(Resource.node)) ||
            (x.out.toString() === this.id &&
              x.in.toString()?.includes(Resource.node))
          );
        }
      );
      console.timeEnd("ActiveNodeStore.afterInit - links");
      if (linksResult && isValidArrayWithData(linksResult)) {
        const links: INodeLinkThumb[] = linksResult.map((x: ILink) => {
          const id = x.in.toString() === this.id ? x.out : x.in;
          return {
            linkedTo: id,
            linkType: x.linkType,
            id: x.id,
            tags: x.tags,
            direction: x.in.toString() === this.id ? "outgoing" : "incoming"
          } as INodeLinkThumb;
        });
        this.update((n) => {
          n.links = links;
          return n;
        });
      }
      if (canHaveTraces.includes(node.contentType)) {
        const result = await this.resourceStore.selectMany({
          filters: {
            parent: this.id.toString()
          }
        });
        let clips: any[] = [];
        if (result && isValidArrayWithData(result)) {
          clips = result.filter(activeResourceFilterIgnoreParentInactive);
        }
        if (
          node.contentType === NodeType.YOUTUBE_VIDEO &&
          clips &&
          Array.isArray(clips)
        ) {
          clips.sort((a, b) => a.body.timestamp - b.body.timestamp);
        }
        this.update((n) => {
          n.clips = clips;
          return n;
        });
      }
    } catch (e) {
      logger.error({ at: "ActiveNodeStore.afterInit", error: e });
    }
  };

  updateBlock = (
    id: IRecordId,
    changedProps: any,
    params?: {
      isDebounced?: boolean;
      debounceKey?: string;
    }
  ) => {
    if (!params?.isDebounced) {
      return this.updateBlockPropagator(id, changedProps);
    }
    const mutationId = `${id.toString()}-${params.debounceKey ?? "block"}`;
    const debouncer = this.resolveDebouncerForBlockPersistance(mutationId);
    debouncer(id, changedProps);
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
        body: params?.body,
        label: ""
      }
    ]);
  };

  createBlocks = async (
    blocks: {
      id: IRecordId;
      contentType: NodeType;
      body: any;
      label?: string;
    }[]
  ) => {
    return this.resourceStore.create(
      blocks.map((x) => ({
        id: x.id,
        contentType: x.contentType,
        creationContext: this.id,
        body: x.body,
        label: x.label ?? ""
      }))
    );
  };

  deleteBlock = async (id: IRecordId) => {
    return this.resourceStore.trash(id);
  };

  deleteMany = async (ids: IRecordId[]) => {
    return this.resourceStore.bulkTrash(ids);
  };

  mention = async (
    location: string,
    id: string,
    params?: { tags?: IRecordId[] }
  ) => {
    const result = await linker.link(this.id, id, {
      linkType: LinkType.MENTION,
      content: {
        location,
        tags: params?.tags
      }
    });
    if (!result) return;
    this.update((n) => ({
      ...n,
      links: [
        ...(n.links ?? []),
        {
          linkedTo: id,
          linkType: LinkType.MENTION,
          direction: "outgoing",
          id: result?.[0]?.id
        }
      ]
    }));
  };
  unmention = async (location: string, id: string) => {
    const result = await linker.unlink(this.id, id, {
      linkType: LinkType.MENTION
    });
    this.update((n) => ({
      ...n,
      links: n.links?.filter(
        (x) =>
          !(
            isSameResource(x.linkedTo, id) &&
            x.direction === "outgoing" &&
            x.linkType === LinkType.MENTION
          )
      )
    }));
  };

  async linkCollection(id: IRecordId) {
    const node = this.get();
    let src = node.id;
    if (node.focusedBlock) src = node.focusedBlock;
    return super.linkCollection(id, src);
  }

  async unlinkCollection(id: IRecordId) {
    const node = this.get();
    let src = node.id;
    if (node.focusedBlock) src = node.focusedBlock;
    return super.unlinkCollection(id, src);
  }

  /**
   * Sets the focused block and parent for the focused block.
   *
   * This is triggered in both the cases of focusing from markdown and breadcrumbs.
   *
   * @param id
   * @param parent
   */
  onFocus(id: IRecordId, parent: IRecordId[]) {
    logger.debug({ at: "ActiveNodeStore.onFocus", id, parent });
    //TODO - refresh collections, links, types
    this.update((n) => {
      n.focusedBlock = id;
      n.mdParent = [...parent, id];
      return n;
    });
  }
  unFocus() {
    //TODO - refresh collections, links, types
    this.update((n) => {
      n.focusedBlock = undefined;
      n.mdParent = [];
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

  /**
   *
   * Note: The md needs to be loaded from NodularMarkdown on init.
   */
  resolveExportContent(): string {
    const node = this.get();
    logger.log({ at: "ActiveNodeStore.resolveExportContent", node });
    if (!node || node?.contentType !== NodeType.NODULAR_MARKDOWN) return "";
    return node.md?.blocks ? generateMarkdownText(node.md.blocks) : "";
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

const nodeStaticActions = {
  metadataPane: {
    value: NodeRightPaneType.METADATA,
    icon: "ph:file-light",
    label: "Show metadata",
    tooltip: "Show metadata"
  },
  propertiesPane: {
    value: NodeRightPaneType.PROPERTIES,
    icon: "shapes",
    label: "Show properties",
    tooltip: "Show properties"
  },
  historyPane: {
    value: NodeRightPaneType.HISTORY,
    icon: "ph:clock-countdown-light",
    label: "Show history",
    tooltip: "Show history"
  },
  showForks: {
    value: "forks",
    icon: "ph:git-fork-light",
    tooltip: "Show forks"
  }
};
class NodeActions {
  constructor(
    private node: INode,
    private store: NodeStore,
    private accessPoint: ResourceAccessPoint
  ) {
    this.node = node;
    this.store = store;
    this.accessPoint = accessPoint;
  }

  download = {
    value: "download",
    icon: "ph:download-simple-light",
    callback: async () => {
      const file = this.node.file ?? this.node.body?.file;
      if (
        isRecordId(file) ||
        (typeof file === "object" && isRecordId(file.id))
      ) {
        await fileStore.download(file);
      }
    }
  };
  share = {
    value: "share",
    icon: "share",
    callback: async () => {}
  };
  export = {
    value: "export",
    icon: "share",
    callback: async () => {}
  };
  trashFromClipper = {
    value: ResourceActionType.DELETE,
    icon: "trash",
    callback: async () => {}
  };
  editNotesOnClipper = {
    value: ResourceActionType.EDIT_NOTES,
    label: "Edit notes",
    icon: "note",
    callback: async () => {}
  };
  editLinksOnClipper = {
    value: ResourceActionType.EDIT_LINKS,
    label: "Edit links",
    icon: "link",
    callback: async () => {}
  };
  editTitleOnClipper = {
    value: ResourceActionType.EDIT_TITLE,
    label: "Edit title",
    icon: "text",
    callback: async () => {}
  };
  goToResourceFromClipper = {
    value: ResourceActionType.OPEN,
    label: "Open in app",
    icon: "weblink-two",
    callback: async () => {}
  };

  sideNotesPane() {
    return {
      value: NodeRightPaneType.SIDENOTES,
      icon: this.node.notes ? "note" : "note-blank",
      label: "Side notes",
      tooltip: "Side notes"
    };
  }

  linksPane() {
    return {
      value: NodeRightPaneType.LINKS,
      icon: "link",
      label: "Show links",
      tooltip: "Show links",
      count:
        "links" in this.node &&
        this.node.links &&
        Array.isArray(this.node.links) &&
        this.node.links.length > 0
          ? this.node.links?.length
          : undefined
    };
  }

  tracesPane() {
    return {
      value: NodeRightPaneType.TRACES,
      icon: "bookmark",
      label: "Show traces",
      tooltip: "Show traces",
      count:
        "clips" in this.node &&
        this.node.clips &&
        Array.isArray(this.node.clips) &&
        this.node.clips.length > 0
          ? this.node.clips?.length
          : undefined
    };
  }

  toggleFullWidth() {
    return {
      value: "toggleFullWidth",
      label: "Expand to full width",
      icon: "widen",
      type: ContextMenuType.SWITCH,
      initialValue: this.node.config?.isWidened,
      callback: async (checked: boolean) => {
        return this.store.modify(this.node.id, {
          config: {
            isWidened: checked
          }
        });
      }
    };
  }
}

export function resolveNodeContextMenu(
  node: INode,
  accessPoint: ResourceAccessPoint,
  params?: {
    isMediaNode?: boolean;
    accessPointId?: IRecordId;
    accessMode?: ResourceAccessMode;
    accessPointContext?: string;
    nodeView?: NodeView;
    isConstrainedWidth?: boolean;
  }
): IContextMenu {
  const resourceActions = new ResourceActions(node, nodeStore, accessPoint);
  const nodeActions = new NodeActions(node, nodeStore, accessPoint);
  if (accessPoint === ResourceAccessPoint.CLIPPER) {
    return [
      {
        group: "all",
        items: [
          nodeActions.editNotesOnClipper,
          nodeActions.editLinksOnClipper,
          nodeActions.editTitleOnClipper,
          nodeActions.goToResourceFromClipper,
          nodeActions.trashFromClipper
        ]
      }
    ];
  }
  const ctx = get(context);
  const viewStore = get(view);
  let commonGroups: { group: string; items: IContextMenuItem[] }[] = [];
  const moreGroup = {
    group: "more",
    items: [resourceActions.archive(), resourceActions.trash()]
  };
  if (ctx.isEmbed && ctx.embed === Embed.HANDSET) {
    commonGroups = [moreGroup];
  } else if (
    accessPoint === ResourceAccessPoint.SELF &&
    params?.accessMode !== ResourceAccessMode.SPLIT &&
    !viewStore.isPortrait
  ) {
    commonGroups = [
      {
        group: "open",
        items: [resourceActions.openAsTab(), resourceActions.openAsFull()]
      },
      moreGroup
    ];
  } else if (
    accessPoint === ResourceAccessPoint.SELF &&
    params?.accessMode === ResourceAccessMode.INLINE &&
    viewStore.isPortrait
  ) {
    commonGroups = [
      {
        group: "open",
        items: [resourceActions.openAsFull()]
      },
      moreGroup
    ];
  } else {
    commonGroups = [
      {
        group: "open",
        items: [
          resourceActions.openAsTab(),
          resourceActions.openAsSplit(),
          resourceActions.openAsFull()
        ]
      },
      moreGroup
    ];
  }
  let mediaShareAndExportGroup = {
    group: "shareAndExport",
    items: [resourceActions.copyLink()]
  };
  if (
    [...mediaNodeTypeList, NodeType.WEB_SCREENSHOT_CLIP].includes(
      node.contentType
    )
  ) {
    mediaShareAndExportGroup.items.unshift(nodeActions.download);
  }
  if (
    (accessPoint === ResourceAccessPoint.NODE_LINKS ||
      accessPoint === ResourceAccessPoint.DEFAULT_RIGHT_PANE_LINKS) &&
    params?.accessPointId
  ) {
    let baseItems = [resourceActions.copyLink()];
    if (accessPoint === ResourceAccessPoint.NODE_LINKS) {
      baseItems.unshift(
        resourceActions.select(accessPoint, params?.accessPointId)
      );
      if (params?.accessPointContext === LinkType.DIRECT) {
        baseItems.unshift(resourceActions.unlink(params?.accessPointId));
      }
    }
    return [
      {
        group: "all",
        items: [...baseItems]
      },
      ...commonGroups
    ];
  } else if (accessPoint != ResourceAccessPoint.SELF) {
    let primaryItems = [
      resourceActions.select(accessPoint, params?.accessPointId),
      resourceActions.star(),
      resourceActions.addToCollection(),
      resourceActions.link(),
      resourceActions.edit(accessPoint),
      resourceActions.copyLink()
    ];
    if (
      accessPoint === ResourceAccessPoint.COLLECTION &&
      params?.accessPointId
    ) {
      primaryItems = [
        resourceActions.unlink(params?.accessPointId),
        resourceActions.select(accessPoint, params?.accessPointId),
        resourceActions.star(),
        resourceActions.edit(accessPoint),
        resourceActions.copyLink()
      ];
    }
    return [
      {
        group: "all",
        items: [...primaryItems]
      },
      ...commonGroups
    ];
  } else if (params?.isConstrainedWidth && params?.isMediaNode) {
    return [
      {
        group: "all",
        items: [
          resourceActions.star(),
          resourceActions.edit(accessPoint),
          nodeActions.tracesPane(),
          nodeActions.linksPane(),
          nodeActions.sideNotesPane(),
          nodeStaticActions.propertiesPane,
          nodeStaticActions.metadataPane
        ]
      },
      mediaShareAndExportGroup,
      ...commonGroups
    ];
  } else if (params?.isMediaNode) {
    return [
      {
        group: "all",
        items: [
          resourceActions.star(),
          resourceActions.edit(accessPoint),
          nodeActions.linksPane(),
          nodeStaticActions.metadataPane
        ]
      },
      mediaShareAndExportGroup,
      ...commonGroups
    ];
  } else if (params?.nodeView === NodeView.BIRD) {
    return [
      {
        group: "all",
        items: [
          resourceActions.star(),
          nodeActions.linksPane(),
          nodeActions.sideNotesPane(),
          nodeStaticActions.propertiesPane,
          nodeStaticActions.metadataPane
        ]
      },
      mediaShareAndExportGroup,
      ...commonGroups
    ];
  }
  const toggleGroupItems =
    node.contentType === NodeType.NODULAR_MARKDOWN
      ? [
          resourceActions.starAsToggle(),
          resourceActions.toggleLock(),
          resourceActions.toggleFocusMode()
        ]
      : [resourceActions.toggleFocusMode()];
  const secondGroupItems = viewStore.isConstrainedWidth
    ? [
        resourceActions.toggleReadMode(),
        nodeStaticActions.metadataPane,
        nodeStaticActions.historyPane
      ]
    : [
        resourceActions.toggleReadMode(),
        nodeActions.toggleFullWidth(),
        nodeStaticActions.metadataPane,
        nodeStaticActions.historyPane
      ];
  return [
    {
      group: "editModes",
      isToggleGroup: true,
      items: toggleGroupItems
    },
    {
      group: "all",
      items: secondGroupItems
    },
    {
      group: "shareAndExport",
      items: [resourceActions.copyLink(), resourceActions.copyContents()]
    },
    ...commonGroups
  ];
}

export function resolveVisibleActions(
  node: INode,
  params?: {
    accessMode?: ResourceAccessMode;
    isConstrainedWidth?: boolean;
  }
): IToggleItem[] {
  const nodeActions = new NodeActions(
    node,
    nodeStore,
    ResourceAccessPoint.SELF
  );
  if (
    (node.contentType === NodeType.NODULAR_MARKDOWN ||
      headingNodeTypes.includes(node.contentType)) &&
    !params?.isConstrainedWidth
  ) {
    return [
      nodeActions.sideNotesPane()
      // nodeActions.showForks
    ];
  } else if (
    (node.contentType === NodeType.NODULAR_MARKDOWN ||
      headingNodeTypes.includes(node.contentType)) &&
    params?.isConstrainedWidth
  ) {
    return [
      nodeActions.linksPane(),
      nodeStaticActions.propertiesPane,
      nodeActions.sideNotesPane()
    ];
  }
  const baseActions: IToggleItem[] = [
    nodeActions.linksPane(),
    nodeStaticActions.propertiesPane,
    nodeActions.sideNotesPane()
  ];
  if (canHaveTraces.includes(node.contentType) && !params?.isConstrainedWidth) {
    baseActions.push(nodeActions.tracesPane());
  }
  return baseActions;
}
