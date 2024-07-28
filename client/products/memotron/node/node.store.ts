import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import {
  type INodeItemCaptured,
  LinkType,
  type IActiveNode,
  type INodeProperty,
  type INode
} from "$lib/client/products/memotron/node/node.type";
import {
  activeResources,
  ActiveResourceStore,
  ResourceStore
} from "$lib/client/components/resourceStores/resource.store";
import type { ISurrealDatabase } from "$lib/client/types/db.type";
import { interceptSurrealResponse, debouncer } from "$lib/client/utils/utils";
import { formatDate } from "$lib/client/utils/time.utils";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import type { IMutationQueueParams } from "../../../types/data.type";
import { ResourceAccessPoint } from "$lib/client/components/resourceStores/resource.type";
import { ResourceActions } from "../common/resource.actions";
import { MemotronAction } from "../memotronAction.enum";
import { appStore } from "$lib/client/stores/app.store";

export const hierarchyFactorLimit = 5;

class NodeStore extends ResourceStore<INode> {
  db: ISurrealDatabase;
  constructor() {
    super(Resource.node, {
      refreshOnAppear: true
    });
    this.db = new SurrealDatabase();
  }
  async createNode(
    capture: INodeItemCaptured[],
    queueParams?: IMutationQueueParams
  ) {
    return super.create(capture, {
      customQuery:
        "return fn::memotron::node::createMany($resources, $mutatedAt);",
      queueParams
    });
  }
  async fetchTimeline(date: Date) {
    const query = `fn::memotron::timeline($date)`;
    const response = await this.db.query(query, {
      date: formatDate(date, "iso")
    });
    return interceptSurrealResponse(response, "fetch timeline");
  }
  async fetch(nodeId: string) {
    const query = `fn::memotron::node::fetch($nodeId)`;
    const response = await this.db.executeReadFn(query, { nodeId });
    return interceptSurrealResponse(response, "fetch node");
  }

  async link(from: string, to: string, linkType: LinkType) {
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
  constructor(node: string) {
    super(node, nodeStore);
  }
  debouncers = new Map<string, any>();
  updateBlockPropagator = (
    id: string,
    mutationId: string,
    changedProps: { body?: string; children?: string[] }
  ) =>
    this.resourceStore.modify(id, changedProps, {
      mutationId,
      isUseQueueFirstApproach: true
    });
  resolveDebouncerForBlockPersistance(id: string) {
    if (!this.debouncers.has(id)) {
      this.debouncers.set(id, debouncer(this.updateBlockPropagator, 2000));
    }
    let val = this.debouncers.get(id);
    return val!;
  }
  fetch = async () => {
    const result = await this.resourceStore.fetch(this.id);
    if (result) {
      this.set(result);
    }
  };
  updateProperties = async (properties: INodeProperty[]) => {
    this.update((prev) => ({ ...prev, properties }));
    return this.resourceStore.modify(this.id, { properties });
  };
  updateBlock = (id: string, changedProps: any) => {
    const mutationId =
      `${id}-` +
      ("children" in changedProps
        ? "children"
        : "body" in changedProps
          ? "body"
          : "block");
    const debouncer = this.resolveDebouncerForBlockPersistance(mutationId);
    debouncer(id, mutationId, changedProps);
  };
  createBlock = async (id: string, contentType: any) => {
    return this.resourceStore.createNode(
      [
        {
          id,
          body: "",
          contentType,
          creationContext: this.id
        }
      ],
      {
        isUseQueueFirstApproach: true,
        mutationId: `${id}-create`
      }
    );
  };
  deleteBlock = async (id: string) => {
    return this.resourceStore.trash(id, {
      isUseQueueFirstApproach: true,
      mutationId: `${id}-delete`
    });
  };
  mention = async (location: string, id: string) => {
    return this.resourceStore.link(location, id, LinkType.MENTION);
  };
}

export function resolveNodeContextMenu(
  node: INode,
  context: ResourceAccessPoint
) {
  const resourceActions = new ResourceActions(node, nodeStore);
  if (context != ResourceAccessPoint.SELF) {
    return [
      {
        group: "all",
        items: [
          resourceActions.star(),
          resourceActions.edit(context),
          resourceActions.select(),
          resourceActions.copyLink()
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
        resourceActions.edit(context),
        resourceActions.copyLink(),
        {
          value: "export",
          icon: "share",
          callback: () => {}
        },
        {
          value: "share",
          icon: "share",
          callback: () => {
            appStore.runAction(MemotronAction.PUBLISH, {
              componentParams: { id: node.id }
            });
          }
        },
        {
          value: "history",
          icon: "history",
          callback: () => {}
        }
      ]
    },
    {
      group: "more",
      items: [resourceActions.archive(), resourceActions.trash()]
    }
  ];
}
