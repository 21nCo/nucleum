import { AvatarType } from "@21n/types/avatar.type";
import { KeyValueStore } from "@21n/components/flux/resourceStores/kv.store";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import type { IMarkdownSettings } from "@21n/components/markdown/md.type";

class MarkdownSettingsStore extends KeyValueStore<IMarkdownSettings> {
  constructor() {
    super(
      Resource.markdownSettings,
      {
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
      },
      { isPreventAutoPersist: true }
    );
  }
  save() {
    return this.modify(this.get());
  }
}
export const markdownSettings = MarkdownSettingsStore.resolve(
  Resource.markdownSettings
);
