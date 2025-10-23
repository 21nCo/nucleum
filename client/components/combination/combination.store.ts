import { get } from "svelte/store";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import {
  ActiveResourceStore,
  ResourceStore
} from "@21n/components/flux/resourceStores/resource.store";
import {
  ResourceAccessMode,
  ResourceAccessPoint
} from "@21n/components/flux/resourceStores/resource.type";
import type { IRecordId } from "@21n/types/data.type";
import { StoreDataType } from "@21n/types/data.type";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import { appStore } from "@21n/stores/app.store";
import { resolveResourceStore } from "@21n/components/flux/resourceStores/store.resolver";
import { logger } from "@21n/components/debug/logger.client";
import type { IAvatar } from "@21n/types/avatar.type";
import {
  CombinationNavItemType,
  CombinationType,
  type IActiveCombination,
  type ICombinationNavItem,
  type ISideNavCombination
} from "@21n/components/combination/combination.type";
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
} from "./combination.utils";

export type ICombinationCapture = {
  label: string;
  description?: string;
  avatar?: IAvatar;
  type?: CombinationType;
  items?: ICombinationNavItem[];
};

const defaults: Partial<ISideNavCombination> = {
  type: CombinationType.SIDENAV,
  items: []
};

class CombinationStore extends ResourceStore<
  ISideNavCombination,
  ICombinationCapture
> {
  constructor() {
    super(Resource.combination, {
      dataType: StoreDataType.FIR,
      defaultProps: defaults
    });
  }

  createSideNavCombination(input: ICombinationCapture) {
    return super.create({
      ...defaults,
      ...input,
      type: input.type ?? CombinationType.SIDENAV,
      items: input.items ?? []
    });
  }
}

export const combinationStore = CombinationStore.resolve(Resource.combination);

export class ActiveCombinationStore extends ActiveResourceStore<
  IActiveCombination,
  CombinationStore,
  ICombination
> {
  constructor(combinationId: IRecordId) {
    super(combinationId, combinationStore);
  }

  private readItems() {
    const combination = get(this) as IActiveCombination | undefined;
    return combination?.items ?? [];
  }

  private async persistItems(items: ICombinationNavItem[]) {
    this.update((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items
      };
    });
    await this.resourceStore.modify(
      this.id,
      { items },
      {
        context: ResourceAccessPoint.COMBINATION
      }
    );
  }

  private async resolveResourceSnapshot(
    resourceId: IRecordId,
    resourceType: Resource
  ) {
    try {
      const store = resolveResourceStore(resourceType);
      if (!store) return undefined;
      const record = await store.select(resourceId);
      if (!record) return undefined;
      return {
        label: record.label ?? record.name ?? "Untitled",
        avatar: record.avatar
      };
    } catch (error) {
      logger.error({
        at: "ActiveCombinationStore.resolveResourceSnapshot",
        error,
        resourceId,
        resourceType
      });
    }
  }

  async init(accessMode: ResourceAccessMode) {
    this.update((prev) => ({
      ...(prev ?? {}),
      isPageLoading: true,
      accessMode
    }));
    const result = await this.resourceStore.select(this.id);
    if (!result) return;
    const record: IActiveCombination = {
      ...result,
      accessMode,
      isPageLoading: false,
      items: cloneNavItems(result.items ?? [])
    };
    this.set(record);
    appStore.addToRecents({
      record: result,
      type: Resource.combination,
      timestamp: new Date()
    });
  }

  async updateLabel(label: string) {
    this.update((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        label
      };
    });
    await this.resourceStore.modify(
      this.id,
      { label },
      {
        context: ResourceAccessPoint.COMBINATION
      }
    );
  }

  async addSection(params: {
    label: string;
    parentId?: string;
    index?: number;
  }) {
    const section: ICombinationNavItem = {
      id: generateSimpleRandomId(),
      type: CombinationNavItemType.SECTION,
      label: params.label,
      children: []
    };
    const updated = insertItem(this.readItems(), section, {
      parentId: params.parentId,
      index: params.index
    });
    await this.persistItems(updated);
    return section.id;
  }

  async addResource(params: {
    resourceId: IRecordId;
    resourceType: Resource;
    parentId?: string;
    index?: number;
    label?: string;
  }) {
    const snapshot = await this.resolveResourceSnapshot(
      params.resourceId,
      params.resourceType
    );
    const label = params.label ?? snapshot?.label ?? "Untitled";
    const resourceItem: ICombinationNavItem = {
      id: generateSimpleRandomId(),
      type: CombinationNavItemType.RESOURCE,
      label,
      resourceId: params.resourceId,
      resourceType: params.resourceType,
      resourceLabel: snapshot?.label ?? label,
      resourceAvatar: snapshot?.avatar,
      avatar: snapshot?.avatar,
      children: []
    };
    const updated = insertItem(this.readItems(), resourceItem, {
      parentId: params.parentId,
      index: params.index
    });
    await this.persistItems(updated);
    return resourceItem.id;
  }

  async updateNavItemLabel(itemId: string, label: string) {
    const updated = updateItemLabel(this.readItems(), itemId, label);
    await this.persistItems(updated);
  }

  async deleteNavItem(itemId: string) {
    const updated = removeItemById(this.readItems(), itemId);
    await this.persistItems(updated);
  }

  async moveNavItem(itemId: string, direction: "up" | "down") {
    const offset = direction === "up" ? -1 : 1;
    const updated = moveItem(this.readItems(), itemId, offset);
    await this.persistItems(updated);
  }

  async indentNavItem(itemId: string) {
    const updated = indentItem(this.readItems(), itemId);
    await this.persistItems(updated);
  }

  async outdentNavItem(itemId: string) {
    const updated = outdentItem(this.readItems(), itemId);
    await this.persistItems(updated);
  }

  async moveNavItemRelative(params: {
    itemId: string;
    targetId: string;
    position: "before" | "after" | "inside";
  }) {
    const updated = moveItemToPosition(
      this.readItems(),
      params.itemId,
      params.targetId,
      params.position
    );
    await this.persistItems(updated);
  }

  async moveNavItemToParent(params: {
    itemId: string;
    parentId?: string;
    index?: number;
  }) {
    const updated = moveItemToParent(
      this.readItems(),
      params.itemId,
      params.parentId,
      params.index
    );
    await this.persistItems(updated);
  }
}
