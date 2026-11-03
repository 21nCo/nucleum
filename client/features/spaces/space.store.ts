import { get, writable } from "svelte/store";
import { Resource } from "@nucleum/datafn/resource.enum";
import {
  AccessMode,
  ResourceAccessPoint
} from "@nucleum/datafn/resource.type";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import {
  SpaceNavItemType,
  SpaceView,
  type IActiveSpace,
  type ISpace,
  type ISpaceNavItem,
  type SpaceDropPosition
} from "@nucleum/features/spaces/space.type";
import {
  cloneNavItems,
  indentItem,
  insertItem,
  moveItem,
  moveItemToParent,
  moveItemToPosition,
  outdentItem,
  removeItemById,
  updateItemLabel
} from "@nucleum/features/spaces/space.utils";
import { determineResourceType } from "@nucleum/datafn/resource.utils";
import { datafn } from "@nucleum/datafn/datafn.store";
import { generateResourceId } from "@nucleum/datafn/id.utils";
import { navigation } from "@nucleum/shell/navigation/navigation";

const activeSpaceStores = new Map<string, ActiveSpaceStore>();

/** Open state and mutations of one space, shared by every view of it. */
export class ActiveSpaceStore {
  id: IRecordId;
  protected subject = writable<IActiveSpace>();
  subscribe = this.subject.subscribe;
  set = this.subject.set;
  update = this.subject.update;

  constructor(spaceId: IRecordId) {
    this.id = spaceId;
  }

  /** Returns the shared store of a space. */
  static resolve(id: IRecordId) {
    const idString = id.toString();
    if (!activeSpaceStores.has(idString)) {
      activeSpaceStores.set(idString, new ActiveSpaceStore(id));
    }
    return activeSpaceStores.get(idString)!;
  }

  setEditMode(isInEditMode: boolean) {
    this.update((prev) => ({ ...(prev ?? {}), isInEditMode }) as IActiveSpace);
  }

  setTitleEditing(isTitleEditing: boolean) {
    this.update(
      (prev) => ({ ...(prev ?? {}), isTitleEditing }) as IActiveSpace
    );
  }

  readItems() {
    return (get(this.subject) as IActiveSpace | undefined)?.items ?? [];
  }

  private async mutate(record: Partial<ISpace>) {
    try {
      await datafn.space.mutate({
        operation: "merge",
        id: this.id.toString(),
        record,
        context: ResourceAccessPoint.SPACE
      });
    } catch (error) {
      logger.error({ at: "ActiveSpaceStore.mutate", error, id: this.id });
      await this.init();
    }
  }

  private async persistItems(items: ISpaceNavItem[]) {
    this.update((prev) => (prev ? { ...prev, items } : prev));
    await this.mutate({ items });
  }

  /** Loads the record, keeping open-state flags across reloads. */
  async init(accessMode?: AccessMode) {
    this.update(
      (prev) =>
        ({
          ...(prev ?? {}),
          isPageLoading: true,
          accessMode: accessMode ?? prev?.accessMode
        }) as IActiveSpace
    );
    let result: ISpace | undefined;
    try {
      result = (await datafn.space.select(this.id.toString(), {
        metadata: {
          includeTrashed: true,
          includeArchived: true
        }
      })) as ISpace | undefined;
    } catch (error) {
      logger.error({ at: "ActiveSpaceStore.init", error, id: this.id });
    }
    if (!result) {
      this.update(
        (prev) =>
          ({
            ...(prev ?? {}),
            isPageLoading: false,
            isMissing: true
          }) as IActiveSpace
      );
      return;
    }
    const record = result;
    this.update((prev) => ({
      ...record,
      view: record.view ?? SpaceView.SIDENAV,
      items: cloneNavItems(record.items ?? []),
      accessMode: accessMode ?? prev?.accessMode,
      isInEditMode: prev?.isInEditMode,
      isTitleEditing: prev?.isTitleEditing,
      isPageLoading: false,
      isMissing: false
    }));
    appStore.addToRecents({
      record,
      type: Resource.space,
      timestamp: new Date()
    });
  }

  async updateLabel(label: string) {
    this.update((prev) => (prev ? { ...prev, label } : prev));
    await this.mutate({ label });
  }

  async updateView(view: SpaceView) {
    this.update((prev) => (prev ? { ...prev, view } : prev));
    await this.mutate({ view });
  }

  /** Adds a section at the root or inside another section and returns its id. */
  async addSection(params: { label: string; parentId?: string; index?: number }) {
    const section: ISpaceNavItem = {
      id: generateSimpleRandomId(),
      type: SpaceNavItemType.SECTION,
      label: params.label,
      children: []
    };
    await this.persistItems(
      insertItem(this.readItems(), section, {
        parentId: params.parentId,
        index: params.index
      })
    );
    return section.id;
  }

  /** Adds a record, capturing its label and avatar as a fallback, and returns the item id. */
  async addResource(params: {
    resourceId: IRecordId;
    label?: string;
    avatar?: ISpaceNavItem["avatar"];
    parentId?: string;
    index?: number;
  }) {
    const item: ISpaceNavItem = {
      id: generateSimpleRandomId(),
      type: SpaceNavItemType.RESOURCE,
      label: params.label ?? "",
      avatar: params.avatar,
      resourceId: params.resourceId,
      resourceType: determineResourceType(params.resourceId)
    };
    await this.persistItems(
      insertItem(this.readItems(), item, {
        parentId: params.parentId,
        index: params.index
      })
    );
    return item.id;
  }

  async updateNavItemLabel(itemId: string, label: string) {
    await this.persistItems(updateItemLabel(this.readItems(), itemId, label));
  }

  async deleteNavItem(itemId: string) {
    await this.persistItems(removeItemById(this.readItems(), itemId));
  }

  async moveNavItem(itemId: string, direction: "up" | "down") {
    await this.persistItems(
      moveItem(this.readItems(), itemId, direction === "up" ? -1 : 1)
    );
  }

  async indentNavItem(itemId: string) {
    await this.persistItems(indentItem(this.readItems(), itemId));
  }

  async outdentNavItem(itemId: string) {
    await this.persistItems(outdentItem(this.readItems(), itemId));
  }

  async moveNavItemRelative(params: {
    itemId: string;
    targetId: string;
    position: SpaceDropPosition;
  }) {
    await this.persistItems(
      moveItemToPosition(
        this.readItems(),
        params.itemId,
        params.targetId,
        params.position
      )
    );
  }

  async moveNavItemToParent(params: {
    itemId: string;
    parentId?: string;
    index?: number;
  }) {
    await this.persistItems(
      moveItemToParent(
        this.readItems(),
        params.itemId,
        params.parentId,
        params.index
      )
    );
  }
}

/**
 * Creates an empty side nav space and opens it as a page with its title ready to
 * rename.
 */
export async function createSpace() {
  const id = generateResourceId(Resource.space);
  try {
    await datafn.space.mutate({
      operation: "insert",
      id,
      record: { id, label: "", view: SpaceView.SIDENAV, items: [] },
      context: ResourceAccessPoint.SPACE
    });
  } catch (error) {
    logger.error({ at: "createSpace", error });
    return;
  }
  const store = ActiveSpaceStore.resolve(id);
  store.setTitleEditing(true);
  navigation.openResource(id, AccessMode.PAGE);
  return id;
}
