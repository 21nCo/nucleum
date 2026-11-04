import { get, writable } from "svelte/store";
import { Resource } from "@nucleum/datafn/resource.enum";
import { AccessMode, ResourceAccessPoint } from "@nucleum/datafn/resource.type";
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
  hasEquivalentNavItem,
  indentItem,
  insertItem,
  moveItem,
  moveItemToParent,
  moveItemToPosition,
  normalizeNavItems,
  outdentItem,
  removeItemById,
  updateItemLabel
} from "@nucleum/features/spaces/space.utils";
import {
  determineResourceType,
  isTrashedResource
} from "@nucleum/datafn/resource.utils";
import { datafn } from "@nucleum/datafn/datafn.store";
import { assertDatafnMutationSucceeded } from "@nucleum/datafn/mutation.utils";
import { generateResourceId } from "@nucleum/datafn/id.utils";
import { navigation } from "@nucleum/shell/navigation/navigation";
import { toasts } from "@nucleum/shared-state/notifications/notification.store";

const activeSpaceStores = new Map<string, ActiveSpaceStore>();
const recordMetadata = { includeTrashed: true, includeArchived: true };

/**
 * `items` followed by those of `added` they do not hold anywhere yet, by item
 * or by the record or page it links to.
 */
function appendMissingItems(items: ISpaceNavItem[], added: ISpaceNavItem[]) {
  return [
    ...items,
    ...cloneNavItems(added.filter((item) => !hasEquivalentNavItem(items, item)))
  ];
}

/** Open state and mutations of one space, shared by every view of it. */
export class ActiveSpaceStore {
  id: IRecordId;
  protected subject = writable<IActiveSpace>();
  subscribe = this.subject.subscribe;
  set = this.subject.set;
  update = this.subject.update;
  private itemsRevision = 0;
  private labelRevision = 0;
  private viewRevision = 0;
  private settledItemsRevision = 0;
  private itemsNamespace: string | null | undefined;
  private itemsWrites: Promise<unknown> = Promise.resolve();
  private loadSequence = 0;
  private latestLoad: Promise<void> = Promise.resolve();

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

  /**
   * Saves `record`. On failure the open state is reloaded from the saved
   * record, or `onFailure` runs instead.
   */
  private async mutate(
    record: Partial<ISpace>,
    onFailure: () => Promise<void> = () => this.init()
  ) {
    try {
      assertDatafnMutationSucceeded(
        await datafn.space.mutate({
          operation: "merge",
          id: this.id.toString(),
          record,
          context: ResourceAccessPoint.SPACE
        })
      );
    } catch (error) {
      logger.error({ at: "ActiveSpaceStore.mutate", error, id: this.id });
      toasts.error("Failed to save space");
      await onFailure();
      return false;
    }
    return true;
  }

  /**
   * Shows `items` and saves them. Saves run one after another in call order,
   * and each carries every earlier local change, so the last one wins with
   * the complete list. A failed save is reloaded over only when no later
   * change is waiting, since that change saves the shown items again. A save
   * queued for one account is dropped when another account is active by the
   * time it runs, and items still loaded from another account are not saved.
   * Each save writes the items shown when it runs, so a change made to them
   * by a queued task in between is kept.
   */
  private async persistItems(items: ISpaceNavItem[]) {
    if (!this.isItemsCurrent()) return false;
    const revision = ++this.itemsRevision;
    const namespace = datafn.currentNamespace();
    this.itemsNamespace = namespace;
    this.update((prev) => (prev ? { ...prev, items } : prev));
    const isCurrent = () => datafn.currentNamespace() === namespace;
    const write = this.itemsWrites.then(async () => {
      try {
        if (!isCurrent() || !this.isItemsCurrent()) return false;
        return await this.mutate({ items: this.readItems() }, async () => {
          this.settledItemsRevision = revision;
          if (revision === this.itemsRevision && isCurrent()) await this.init();
        });
      } finally {
        this.settledItemsRevision = revision;
      }
    });
    this.itemsWrites = write.catch(() => undefined);
    return write;
  }

  /** Whether the shown items were loaded or edited in the active account. */
  private isItemsCurrent() {
    return this.itemsNamespace === datafn.currentNamespace();
  }

  /** Whether the open state holds the space's items, loaded in the active account. */
  hasLoadedItems() {
    return (
      !!(get(this.subject) as IActiveSpace | undefined)?.items &&
      this.isItemsCurrent()
    );
  }

  /**
   * Appends items to the saved space and returns whether they were saved. It
   * runs in the save queue, after every earlier local change is saved, and
   * appends the items missing from the record as saved then, so it keeps
   * changes saved elsewhere and items the user removed stay removed. The shown
   * items become that result, or, when the user changed them in the meantime,
   * gain the appended items, which the user's queued saves then carry.
   */
  async appendItems(items: ISpaceNavItem[]) {
    const namespace = datafn.currentNamespace();
    const revision = this.itemsRevision;
    const isCurrent = () => datafn.currentNamespace() === namespace;
    const task = this.itemsWrites.then(async () => {
      if (!isCurrent()) return false;
      const saved = (await datafn.space.select(this.id.toString(), {
        metadata: recordMetadata
      })) as ISpace | undefined;
      if (!saved || isTrashedResource(saved) || !isCurrent()) return false;
      const next = appendMissingItems(saved.items ?? [], items);
      if (!(await this.mutate({ items: next }, async () => undefined))) {
        return false;
      }
      if (!isCurrent()) return true;
      if (this.itemsRevision === revision) {
        this.itemsRevision++;
        this.settledItemsRevision = this.itemsRevision;
        this.update((prev) => (prev ? { ...prev, items: next } : prev));
      } else {
        this.update((prev) =>
          prev
            ? { ...prev, items: appendMissingItems(prev.items ?? [], items) }
            : prev
        );
      }
      return true;
    });
    this.itemsWrites = task.catch(() => undefined);
    return task;
  }

  /**
   * Loads the record, keeping open-state flags across reloads. Items edited in
   * the same account, and the title and view, edited while the record loads are
   * kept, since they are newer than the loaded copy, and items left from another
   * account are replaced. A load overtaken by a later one is dropped and settles
   * when the latest load has been applied, so no caller proceeds without loaded
   * items. Pass `isRecordedInRecents: false` when the space is loaded only to read its
   * settings, so it does not move to the top of recents.
   */
  init(
    accessMode?: AccessMode,
    options: { isRecordedInRecents?: boolean } = {}
  ) {
    const load = this.load(accessMode, options);
    this.latestLoad = load;
    return load;
  }

  private async load(
    accessMode: AccessMode | undefined,
    options: { isRecordedInRecents?: boolean }
  ): Promise<void> {
    const load = ++this.loadSequence;
    const itemsRevisionAtStart = this.itemsRevision;
    const labelRevisionAtStart = this.labelRevision;
    const viewRevisionAtStart = this.viewRevision;
    const namespace = datafn.currentNamespace();
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
      if (load !== this.loadSequence) return this.latestLoad;
      this.update(
        (prev) =>
          ({
            ...(prev ?? {}),
            isPageLoading: false,
            isLoadFailed: true
          }) as IActiveSpace
      );
      return;
    }
    if (load !== this.loadSequence) return this.latestLoad;
    if (!result) {
      this.update(
        (prev) =>
          ({
            ...(prev ?? {}),
            isPageLoading: false,
            isMissing: true,
            isLoadFailed: false
          }) as IActiveSpace
      );
      return;
    }
    const record = result;
    this.update((prev) => ({
      ...record,
      label:
        prev && this.labelRevision !== labelRevisionAtStart
          ? prev.label
          : record.label,
      view:
        prev && this.viewRevision !== viewRevisionAtStart
          ? prev.view
          : (record.view ?? SpaceView.SIDENAV),
      items:
        prev?.items &&
        this.itemsNamespace === namespace &&
        (this.itemsRevision !== itemsRevisionAtStart ||
          this.itemsRevision !== this.settledItemsRevision)
          ? prev.items
          : normalizeNavItems(record.items ?? []),
      accessMode: accessMode ?? prev?.accessMode,
      isInEditMode: prev?.isInEditMode,
      isTitleEditing: prev?.isTitleEditing,
      isPageLoading: false,
      isMissing: false,
      isLoadFailed: false
    }));
    this.itemsNamespace = namespace;
    if (options.isRecordedInRecents === false) return;
    appStore.addToRecents({
      record,
      type: Resource.space,
      timestamp: new Date()
    });
  }

  async updateLabel(label: string) {
    this.labelRevision++;
    this.update((prev) => (prev ? { ...prev, label } : prev));
    return this.mutate({ label });
  }

  async updateView(view: SpaceView) {
    this.viewRevision++;
    this.update((prev) => (prev ? { ...prev, view } : prev));
    return this.mutate({ view });
  }

  /** Adds a section at the root or inside another section and returns its id, or undefined when saving fails. */
  async addSection(params: {
    label: string;
    parentId?: string;
    index?: number;
  }) {
    const section: ISpaceNavItem = {
      id: generateSimpleRandomId(),
      type: SpaceNavItemType.SECTION,
      label: params.label,
      children: []
    };
    const isSaved = await this.persistItems(
      insertItem(this.readItems(), section, {
        parentId: params.parentId,
        index: params.index
      })
    );
    return isSaved ? section.id : undefined;
  }

  /** Adds a record, capturing its label and avatar as a fallback, and returns the item id, or undefined when saving fails. */
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
    const isSaved = await this.persistItems(
      insertItem(this.readItems(), item, {
        parentId: params.parentId,
        index: params.index
      })
    );
    return isSaved ? item.id : undefined;
  }

  async updateNavItemLabel(itemId: string, label: string) {
    return this.persistItems(updateItemLabel(this.readItems(), itemId, label));
  }

  async deleteNavItem(itemId: string) {
    return this.persistItems(removeItemById(this.readItems(), itemId));
  }

  async moveNavItem(itemId: string, direction: "up" | "down") {
    return this.persistItems(
      moveItem(this.readItems(), itemId, direction === "up" ? -1 : 1)
    );
  }

  async indentNavItem(itemId: string) {
    return this.persistItems(indentItem(this.readItems(), itemId));
  }

  async outdentNavItem(itemId: string) {
    return this.persistItems(outdentItem(this.readItems(), itemId));
  }

  async moveNavItemRelative(params: {
    itemId: string;
    targetId: string;
    position: SpaceDropPosition;
  }) {
    return this.persistItems(
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
    return this.persistItems(
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
 * Appends the items a saved space does not hold yet and returns whether they
 * were saved. While a view of the space has its items open, the append runs in
 * that view's save queue, in order with the user's edits. Otherwise the record
 * is read and written directly, and an open view reloads. Either way it stops
 * without writing when the space is in the trash or another account becomes
 * active meanwhile.
 */
export async function appendSpaceItems(id: IRecordId, items: ISpaceNavItem[]) {
  const store = activeSpaceStores.get(id.toString());
  if (store?.hasLoadedItems()) return store.appendItems(items);
  const namespace = datafn.currentNamespace();
  const isCurrent = () => datafn.currentNamespace() === namespace;
  const saved = (await datafn.space.select(id.toString(), {
    metadata: recordMetadata
  })) as ISpace | undefined;
  if (!saved || isTrashedResource(saved) || !isCurrent()) return false;
  assertDatafnMutationSucceeded(
    await datafn.space.mutate({
      operation: "merge",
      id: id.toString(),
      record: { items: appendMissingItems(saved.items ?? [], items) },
      context: ResourceAccessPoint.SPACE
    })
  );
  if (!isCurrent()) return false;
  await reloadActiveSpace(id);
  return true;
}

/**
 * Reloads the open state of a space from its record when a view of it already
 * exists, so items written outside the store are shown and kept by later edits.
 */
export async function reloadActiveSpace(id: IRecordId) {
  const store = activeSpaceStores.get(id.toString());
  if (!store) return;
  await store.init(undefined, { isRecordedInRecents: false });
}

/**
 * Inserts a space record, under `id` when given, and returns its id, or undefined
 * when the insert fails. Spaces start as an empty side nav.
 */
export async function insertSpace(
  params: {
    id?: string;
    label?: string;
    view?: SpaceView;
    items?: ISpaceNavItem[];
  } = {}
) {
  const id = params.id ?? generateResourceId(Resource.space);
  try {
    assertDatafnMutationSucceeded(
      await datafn.space.mutate({
        operation: "insert",
        id,
        record: {
          id,
          label: params.label ?? "",
          view: params.view ?? SpaceView.SIDENAV,
          items: params.items ?? []
        },
        context: ResourceAccessPoint.SPACE
      })
    );
  } catch (error) {
    logger.error({ at: "insertSpace", error });
    return;
  }
  return id;
}

/**
 * Creates an empty side nav space and opens it as a page with its title ready to
 * rename.
 */
export async function createSpace() {
  const id = await insertSpace();
  if (!id) {
    toasts.error("Failed to create space");
    return;
  }
  const store = ActiveSpaceStore.resolve(id);
  store.setTitleEditing(true);
  navigation.openResource(id, AccessMode.PAGE);
  return id;
}
