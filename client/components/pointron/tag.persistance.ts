import { Cloud } from "$lib/client/types/cloud.enum";
import { Item } from "$lib/client/types/item.enum";
import { get } from "svelte/store";
import { retrieveLocally } from "$lib/client/stores/persistance";
import { cloudProvider } from "$lib/client/stores/app.store";
import type { Tag } from "$lib/client/types/pointron/tag.type";

export class TagPersistance {
  search(query: string) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        let tags = retrieveLocally(Item.PointTag);
        tags = tags.filter((tag: Tag) => tag.label.includes(query));
        return tags;
    }
    return [];
  }
  retrieveTags(tagIds: string[]) {
    let tags: Tag[] = [];
    switch (get(cloudProvider)) {
      case Cloud.local:
        let savedTags: Tag[] = retrieveLocally(Item.PointTag);
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
