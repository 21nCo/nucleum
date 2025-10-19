import { ObservableStore } from "@21n/stores/client.store";
import { GlobalEvent } from "@21n/types/event.enum";
import { dispatchCustomEvent } from "@21n/utils/browser.utils";

class CacheStore extends ObservableStore<{ [key: string]: any }> {
  constructor() {
    super("cache");
    this.set({});
  }

  replace(key: string, value: any) {
    this.update((x) => {
      x[key] = value;
      return x;
    });
    this.triggerCacheUpdateEvent(key);
  }

  replaceUsingSubKey(key: string, subKey: string, value: any) {
    const current = this.retrieve(key);
    this.replace(key, {
      ...current,
      [subKey]: value
    });
  }

  retrieve(key: string) {
    return this.get()[key];
  }

  private triggerCacheUpdateEvent(key: string) {
    dispatchCustomEvent(GlobalEvent.CACHE_UPDATE, { key });
  }
}

export const cache = new CacheStore();
