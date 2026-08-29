import { AvatarType } from "@21n/types/avatar.type";
import { Resource } from "@21n/data/datafn/resource.enum";
import type { IMarkdownSettings } from "@21n/components/markdown/md.type";
import { datafn } from "@21n/stores/datafn.store";
import { get, writable } from "svelte/store";

const markdownSettingsSeed: IMarkdownSettings = {
  callout: [
    {
      id: "info",
      avatar: {
        type: AvatarType.ICON,
        isFilled: true,
        code: "&#XE88E"
      },
      color: 217,
      label: "Info"
    }
  ]
};

const markdownSettingsSignal = datafn.kv.signal<IMarkdownSettings>(
  Resource.markdownSettings,
  { defaultValue: markdownSettingsSeed }
);
const markdownSettingsLocal = writable<IMarkdownSettings>(markdownSettingsSeed);

markdownSettingsSignal.subscribe((value) => {
  markdownSettingsLocal.set(value ?? markdownSettingsSeed);
});

export const markdownSettings = {
  subscribe: markdownSettingsLocal.subscribe,
  get() {
    return get(markdownSettingsLocal);
  },
  save() {
    return this.modify(this.get());
  },
  loader(data: IMarkdownSettings) {
    markdownSettingsLocal.set(data);
    return datafn.kv.set(Resource.markdownSettings, data);
  },
  modify(n: Partial<IMarkdownSettings>) {
    markdownSettingsLocal.update((current) => ({ ...current, ...n }));
    return datafn.kv.merge(Resource.markdownSettings, n);
  },
  destroy() {
    markdownSettingsSignal.dispose();
  }
};
