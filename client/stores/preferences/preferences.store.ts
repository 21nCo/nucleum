import { Resource } from "@21n/data/datafn/resource.enum";
import { logger } from "@21n/components/debug/logger.client";
import { get, writable } from "svelte/store";
import { appStore } from "@21n/stores/app.store";
import { datafn } from "@21n/stores/datafn.store";
import {
  Preference,
  PreferencesScope,
  type IPreferencesParams,
  type IPreferencesStore
} from "@21n/stores/preferences/preferences.type";

const preferencesSignal = datafn.kv.signal<IPreferencesStore>(
  Resource.preferences,
  { defaultValue: {} }
);
const preferencesLocal = writable<IPreferencesStore>({});

preferencesSignal.subscribe((value) => {
  preferencesLocal.set(value ?? {});
});

function resolveKey(keyParam: string, params?: IPreferencesParams) {
  let key: string = keyParam;

  if (params?.scope === PreferencesScope.PRODUCT) {
    const product = get(appStore).product;
    key = `${product}-${key}`;
  }

  if (params?.subVariables) {
    params.subVariables.forEach((subVariable) => {
      key = `${key}_${subVariable}`;
    });
  }

  return key;
}

export const preferences = {
  subscribe: preferencesLocal.subscribe,
  get() {
    return get(preferencesLocal);
  },
  save(keyParam: Preference | string, value: any, params?: IPreferencesParams) {
    const key = resolveKey(keyParam, params);
    this.modify({ [key]: value });
    logger.log({ context: "preferences.store - setPreference", key, value });
  },
  resolve(keyParam: Preference | string, params?: IPreferencesParams): unknown {
    const key = resolveKey(keyParam, params);
    return this.get()[key];
  },
  modify(n: Partial<IPreferencesStore>) {
    preferencesLocal.update((current) => ({ ...current, ...n }));
    return datafn.kv.merge(Resource.preferences, n);
  },
  loader(data: IPreferencesStore) {
    preferencesLocal.set(data);
    return datafn.kv.set(Resource.preferences, data);
  },
  destroy() {
    preferencesSignal.dispose();
  }
};
