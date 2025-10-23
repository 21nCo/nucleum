import { KeyValueStore } from "@21n/components/flux/resourceStores/kv.store";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { logger } from "@21n/components/debug/logger.client";
import { get } from "svelte/store";
import { appStore } from "@21n/stores/app.store";
import {
  Preference,
  PreferencesScope,
  type IPreferencesParams,
  type IPreferencesStore
} from "@21n/stores/preferences/preferences.type";

class PreferencesStore extends KeyValueStore<IPreferencesStore> {
  constructor() {
    super(Resource.preferences, {});
  }

  private resolveKey(keyParam: string, params?: IPreferencesParams) {
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

  save(keyParam: Preference | string, value: any, params?: IPreferencesParams) {
    const key = this.resolveKey(keyParam, params);
    this.modify({ [key]: value });
    logger.log({ context: "preferences.store - setPreference", key, value });
  }

  resolve(keyParam: Preference | string, params?: IPreferencesParams): unknown {
    const key = this.resolveKey(keyParam, params);
    return this.get()[key];
  }
}

export const preferences = PreferencesStore.resolve(Resource.preferences);
