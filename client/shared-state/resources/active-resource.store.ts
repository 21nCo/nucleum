import { get, writable } from "svelte/store";
import { type IRecordId } from "@nucleum/schema/legacy/data.type";
import {
  type AccessMode,
  type IActiveResource,
  type IResource,
  type IResourceStarrable
} from "@nucleum/datafn/resource.type";
import { determineResourceType } from "@nucleum/datafn/resource.utils";
import { resolveCurrentUserId } from "@nucleum/client/runtime/account/session-token";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { toasts } from "@nucleum/shared-state/notifications/notification.store";
import { datafn } from "@nucleum/datafn/datafn.store";

const activeResources = new Map<string, ActiveResourceStore<any, any>>();
const activeResourceOwners = new Map<
  string,
  { accessMode: AccessMode | undefined }[]
>();

export function updateActiveResource(
  id: IRecordId,
  value: Partial<IActiveResource & IResourceStarrable>
) {
  const activeResource = activeResources.get(id.toString());
  if (!activeResource) return;
  activeResource.update((prev) => ({ ...prev, ...value }));
}

export function copyActiveResourceContents(id: IRecordId) {
  const activeResource = activeResources.get(id.toString());
  if (!activeResource) return;
  const content = activeResource.resolveExportContent();
  if (!content) {
    toasts.error("This resource has no content to copy.");
    return;
  }
  const clipboard = navigator.clipboard;
  if (!clipboard) {
    toasts.error("Could not copy to the clipboard.");
    return;
  }
  clipboard.writeText(content).catch((error) => {
    logger.error({ at: "copyActiveResourceContents", id, error });
    toasts.error("Could not copy to the clipboard.");
  });
}

export class ActiveResourceStore<
  T extends IResource,
  V extends IActiveResource = IActiveResource
> {
  id: IRecordId;
  protected subject = writable<V>();
  protected currentUserIdPromise: Promise<string | null>;
  subscribe = this.subject.subscribe;
  set = this.subject.set;
  update = this.subject.update;

  constructor(id: IRecordId) {
    this.id = id;
    this.currentUserIdPromise = resolveCurrentUserId().catch((error) => {
      logger.error({ at: "ActiveResourceStore.currentUserId", id, error });
      return null;
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
    const currentUserId = await this.currentUserIdPromise;
    await this.table().mutate({
      operation: "trash",
      id: this.id.toString()
    });
    this.update(
      (prev) =>
        ({
          ...(prev ?? ({} as V)),
          trashedAt: new Date(),
          trashedBy: currentUserId
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

  /**
   * Marks the store of `id` as used by a mounted view open in `accessMode`,
   * such as a resource shown both on the base page and on the page covering
   * it. The returned function releases it: the store takes back the access
   * mode of the newest view still mounted, and is dropped after its last
   * owner releases.
   */
  static retain(id: IRecordId, accessMode?: AccessMode) {
    const idStr = id.toString();
    const owner = { accessMode };
    activeResourceOwners.set(idStr, [
      ...(activeResourceOwners.get(idStr) ?? []),
      owner
    ]);
    return () => {
      const owners = activeResourceOwners.get(idStr) ?? [];
      if (!owners.includes(owner)) return;
      const remaining = owners.filter((item) => item !== owner);
      if (remaining.length > 0) {
        activeResourceOwners.set(idStr, remaining);
        const mode = remaining[remaining.length - 1].accessMode;
        activeResources
          .get(idStr)
          ?.update((prev) => (prev ? { ...prev, accessMode: mode } : prev));
        return;
      }
      activeResourceOwners.delete(idStr);
      activeResources.delete(idStr);
    };
  }
}
