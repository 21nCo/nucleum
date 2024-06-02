import { writable } from "svelte/store";
import type { DbRecord } from "../types/dbrecord.type";
import { debouncer } from "../utils/utils";
import type { ResourcePersistance } from "./resource.persistance";

export class ActiveResourceStore<T> {
  id: string;
  protected store = writable<T>();
  protected debouncedPersist: any;
  protected persistance: ResourcePersistance;
  protected currentUserId: string;
  subscribe = this.store.subscribe;
  set = this.store.set;
  update = this.store.update;
  constructor(
    id: string,
    persistance: ResourcePersistance,
    currentUserId: string
  ) {
    this.id = id;
    this.persistance = persistance;
    this.currentUserId = currentUserId;
    const updatePropagator = (val: Partial<DbRecord>) =>
      this.persistance.modify(this.id, val);
    this.debouncedPersist = debouncer(updatePropagator, 2000);
  }
  modify(val: Partial<T>) {
    this.update((prev: T) => ({ ...prev, ...val }));
    return this.persistance.modify(this.id, val);
  }
  debouncedModify(val: Partial<T>) {
    this.update((prev: T) => ({ ...prev, ...val }));
    return this.debouncedPersist(val);
  }
  /**
   * @deprecated - use {@link debouncedModify} instead
   */
  propagateTitleChange(label: string) {
    return this.debouncedPersist({ label });
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
