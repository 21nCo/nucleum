import { AvatarType } from "$lib/client/types/avatar.type";
import { KeyValueStore } from "../flux/resourceStores/kv.store";
import { Resource } from "../flux/resourceStores/resource.enum";
import type { IMarkdownSettings } from "./md.type";

class MarkdownSettingsStore extends KeyValueStore<IMarkdownSettings> {
  constructor() {
    super(Resource.markdownSettings, {
      callout: [
        {
          avatar: {
            type: AvatarType.ICON,
            isFilled: true,
            code: "&#XE88E"
          },
          color: 0,
          label: "Info"
        }
      ]
    });
  }
}

export const markdownSettings = new MarkdownSettingsStore();
