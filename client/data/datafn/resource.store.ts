import { get, writable } from "svelte/store";
import { type IRecordId } from "@21n/types/data.type";
import type {
  AccessMode,
  IActiveResource,
  IResource
} from "./resource.type";
import {
  determineResourceAccessMode,
  determineResourceType
} from "./resource.utils";
import { resolveCurrentUserId } from "@21n/utils/account.utils";
import { logger } from "@21n/components/debug/logger.client";
import { toasts } from "@21n/stores/notification.store";
import { datafn } from "@21n/stores/datafn.store";

const activeResources = new Map<string, ActiveResourceStore<any, any>>();

export function updateActiveResource(
  id: IRecordId,
  value: Partial<IActiveResource>
) {
  const activeResource = activeResources.get(id.toString());
  if (!activeResource) return;
  activeResource.update((prev) => ({ ...prev, ...value }));
}

export function copyActiveResourceContents(id: IRecordId) {
  const activeResource = activeResources.get(id.toString());
  if (!activeResource) return;
  const content = activeResource.resolveExportContent();
  logger.log({
    at: "copyActiveResourceContents",
    content,
    activeResource
  });
  if (content) {
    navigator.clipboard.writeText(content);
  } else {
    toasts.error("Something went wrong. Please try again.");
  }
}

export class ActiveResourceStore<
  T extends IResource,
  V extends IActiveResource = IActiveResource
> {
  id: IRecordId;
  protected subject = writable<V>();
  protected currentUserId?: string;
  subscribe = this.subject.subscribe;
  set = this.subject.set;
  update = this.subject.update;

  constructor(id: IRecordId) {
    this.id = id;
    resolveCurrentUserId().then((value) => {
      this.currentUserId = value;
    });
  }

  private table() {
    return datafn.table(determineResourceType(this.id));
  }

  async modify(
    _val: Partial<T>,
    _params?: { isPreventBackPropagation?: boolean }
  ) {
    throw new Error(`${this.id} does not implement active DataFn modify`);
  }

  debouncedModify(_val: Partial<T>, _key?: string) {
    throw new Error(`${this.id} does not implement active DataFn modify`);
  }

  async delete() {
    await this.table().mutate({
      operation: "trash",
      id: this.id.toString()
    });
    this.update(
      (prev) =>
        ({
          ...(prev ?? ({} as V)),
          trashedAt: new Date(),
          trashedBy: this.currentUserId ?? null
        }) as V
    );
  }

  async deletePermanently() {
    await this.table().mutate({
      operation: "delete",
      id: this.id.toString()
    });
    activeResources.delete(this.id.toString());
  }

  async archive() {
    await this.table().mutate({
      operation: "archive",
      id: this.id.toString()
    });
    this.update(
      (prev) =>
        ({
          ...(prev ?? ({} as V)),
          isArchived: true
        }) as V
    );
  }

  async unarchive() {
    await this.table().mutate({
      operation: "unarchive",
      id: this.id.toString()
    });
    this.update(
      (prev) =>
        ({
          ...(prev ?? ({} as V)),
          isArchived: false
        }) as V
    );
  }

  async restore() {
    await this.table().mutate({
      operation: "restore",
      id: this.id.toString()
    });
    this.update(
      (prev) =>
        ({
          ...(prev ?? ({} as V)),
          trashedAt: null,
          trashedBy: null
        }) as V
    );
  }

  toggleReadMode(val: boolean) {
    return this.update((prev) => ({ ...prev, isInReadOnlyMode: val }));
  }

  toggleEditMode(val: boolean) {
    return this.update((prev) => ({ ...prev, isInEditMode: val }));
  }

  async toggleLock(val: boolean) {
    await this.table().mutate({
      operation: "merge",
      id: this.id.toString(),
      record: {
        id: this.id.toString(),
        isLocked: val
      }
    });
    this.update(
      (prev) =>
        ({
          ...(prev ?? ({} as V)),
          isLocked: val
        }) as V
    );
  }

  get() {
    return get(this.subject);
  }

  resolveExportContent(): string {
    const current = this.get();
    if (
      current &&
      typeof current === "object" &&
      "content" in current &&
      typeof current.content === "string"
    ) {
      return current.content;
    }
    return "";
  }

  static resolve<TActive extends ActiveResourceStore<any, any>>(
    this: new (id: IRecordId) => TActive,
    id: IRecordId
  ): TActive {
    const idStr = id.toString();
    if (!activeResources.has(idStr)) {
      activeResources.set(idStr, new this(id));
    }
    return activeResources.get(idStr)! as TActive;
  }

  static destroy(id: IRecordId, accessMode?: AccessMode) {
    if (accessMode === "full") {
      const resolvedAccessMode = determineResourceAccessMode(id);
      if (resolvedAccessMode !== "full") {
        const resource = activeResources.get(id.toString());
        if (resource) {
          resource.update((prev) => ({
            ...prev,
            accessMode: resolvedAccessMode
          }));
        }
        return;
      }
    }
    activeResources.delete(id.toString());
  }
}
