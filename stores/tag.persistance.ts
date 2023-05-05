import { Cloud } from "$lib/tidy/types/cloud.enum";
import { ItemType } from "$lib/tidy/types/item.enum";
import { get } from "svelte/store";
import { retrieveLocally } from "./persistance";
import { cloudProvider } from "$lib/local/stores/session.store";
import type { Tag } from "$lib/local/types/tag.type";

export class TagPersistance {
  search(query: string) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        let tags = retrieveLocally(ItemType.Tag);
        tags = tags.filter((tag: Tag) => tag.label.includes(query));
        return tags;
    }
    return [];
  }
  retrieveTags(tagIds: string[]) {
    let tags: Tag[] = [];
    switch (get(cloudProvider)) {
      case Cloud.local:
        let savedTags: Tag[] = retrieveLocally(ItemType.Tag);
        if (!savedTags) return;
        tagIds.forEach((id) => {
          const tag = savedTags.find((tag: Tag) => tag.id == id);
          if (tag) tags.push(tag);
        });
        return tags;
    }
    return tags;
  }
}
