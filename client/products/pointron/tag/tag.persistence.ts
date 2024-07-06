import { Cloud } from "$lib/client/types/cloud.enum";
import { Item } from "$lib/client/types/item.enum";
import { get } from "svelte/store";
import type { ITag } from "$lib/client/types/pointron/tag.type";
import { cloudProvider } from "$lib/client/persistence/persistence";
import { retrieveLocally } from "$lib/client/utils/storage.utils";

export class TagPersistence {
  search(query: string) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        let tags = retrieveLocally(Item.PointTag);
        tags = tags.filter((tag: ITag) => tag.label.includes(query));
        return tags;
    }
    return [];
  }
  retrieveTags(tagIds: string[]) {
    let tags: ITag[] = [];
    switch (get(cloudProvider)) {
      case Cloud.local:
        let savedTags: ITag[] = retrieveLocally(Item.PointTag);
        if (!savedTags) return;
        tagIds.forEach((id) => {
          const tag = savedTags.find((tag: ITag) => tag.id == id);
          if (tag) tags.push(tag);
        });
        return tags;
    }
    return tags;
  }
}
