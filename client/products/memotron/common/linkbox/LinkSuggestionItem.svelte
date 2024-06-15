<script lang="ts">
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  import type { IAvatar } from "$lib/client/types/avatar.type";
  import { CurationType } from "$lib/client/types/memotron/curation.type";
  import { Size } from "$lib/client/types/size.enum";
  import { onMount } from "svelte";
  import {
    resolveAssociatedType,
    resolveNodeParentHierarchy
  } from "../../memotron.store";
  import {
    NodeType,
    headingNodeTypes
  } from "$lib/client/types/memotron/node.type";
  import Breadcrumb from "$lib/client/elements/breadcrumb/Breadcrumb.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  export let item: any;
  export let isActive: boolean = false;
  let avatar: IAvatar | undefined = undefined;
  let parentHierarchy: any[] = [];
  onMount(async () => {
    avatar = await resolveAvatar();
    console.log({ item, avatar });
    if (headingNodeTypes.includes(item.contentType)) {
      parentHierarchy = await resolveNodeParentHierarchy(item.id);
      console.log({ item, parentHierarchy });
    }
  });
  async function resolveAvatar() {
    if (!item.type?.includes("type:")) {
      return;
    }
    const type = await resolveAssociatedType(item.type);
    return type?.avatar;
  }
</script>

<div
  class={cn("flex w-full justify-between items-center", {
    "h-12": parentHierarchy.length > 0,
    "h-8": parentHierarchy.length == 0
  })}
>
  <span class="flex flex-col h-full">
    {#if parentHierarchy.length > 0}
      <div>
        <Breadcrumb
          items={parentHierarchy.map((x) => {
            return {
              label: x.label ?? x.body
            };
          })}
        />
      </div>
    {/if}
    <div class="flex gap-2">
      {#if avatar}
        <span>
          <AvatarView {avatar} size={Size.md} />
        </span>
      {/if}
      <span>
        {item.label}
      </span>
    </div>
  </span>
  <span class="text-b3 text-fgs3"
    >{item.type === CurationType.COLLECTION ? "Collection" : "Node"}</span
  >
</div>
