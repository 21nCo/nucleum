import { writable } from "svelte/store";
import type { DbRecord } from "../types/dbrecord.type";
import { debouncer } from "../utils/utils";
import type { ResourcePersistence } from "../persistence/resource.persistence";

export class ActiveResourceStore<T> {
  id: string;
  protected store = writable<T>();
  protected debouncedPersistBlock: any;
  protected persistance: ResourcePersistence;
  protected currentUserId: string;
  subscribe = this.store.subscribe;
  set = this.store.set;
  update = this.store.update;
  constructor(
    id: string,
    persistance: ResourcePersistence,
    currentUserId: string
  ) {
    this.id = id;
    this.persistance = persistance;
    this.currentUserId = currentUserId;
    const updatePropagator = (val: Partial<DbRecord>) =>
      this.persistance.modify(this.id, val);
    this.debouncedPersistBlock = debouncer(updatePropagator, 2000);
  }
  modify(val: Partial<T>) {
    this.update((prev: T) => ({ ...prev, ...val }));
    return this.persistance.modify(this.id, val);
  }
  debouncedModify(val: Partial<T>) {
    this.update((prev: T) => ({ ...prev, ...val }));
    return this.debouncedPersistBlock(val);
  }
  /**
   * @deprecated - use {@link debouncedModify} instead
   */
  propagateTitleChange(label: string) {
    return this.debouncedPersistBlock({ label });
  }
  delete() {
    this.update((prev: T) => ({
      ...prev,
      trashInformation: {
        deletedBy: this.currentUserId,
        deletedAt: new Date().toISOString()
      }
    }));
    return this.persistance.delete(this.id);
  }
  archive() {
    this.update((prev: T) => ({
      ...prev,
      isArchived: true,
      modifiedBy: this.currentUserId,
      modifiedAt: new Date().toISOString()
    }));
    return this.persistance.modify(this.id, { isArchived: true });
  }
  unarchive() {
    this.update((prev: T) => ({
      ...prev,
      isArchived: false,
      modifiedBy: this.currentUserId,
      modifiedAt: new Date().toISOString()
    }));
    return this.persistance.modify(this.id, { isArchived: false });
  }
  restore() {
    this.update((prev: T) => ({ ...prev, trashInformation: undefined }));
    return this.persistance.modify(this.id, { trashInformation: undefined });
  }
}
