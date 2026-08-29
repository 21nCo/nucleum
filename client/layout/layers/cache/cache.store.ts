import { ObservableStore } from "@21n/stores/client.store";

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
}

export const cache = new CacheStore();
