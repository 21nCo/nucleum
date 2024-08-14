<script lang="ts">
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  import type { IAvatar } from "$lib/client/types/avatar.type";
  import { CurationType } from "$lib/client/products/memotron/curation/curation.type";
  import { Size } from "$lib/client/types/size.enum";
  import { onMount } from "svelte";
  import {
    resolveAssociatedType,
    resolveNodeParentHierarchy
  } from "../../memotron.store";
  import {
    NodeType,
    headingNodeTypes
  } from "$lib/client/products/memotron/node/node.type";
  import Breadcrumb from "$lib/client/elements/breadcrumb/Breadcrumb.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import TextWithHoverTooltip from "$lib/client/elements/text/TextWithHoverTooltip.svelte";
  import { determineResourceType } from "$lib/client/components/resourceStores/resource.utils";
  import { properCase } from "$lib/shared/utils/text.utils";
  export let item: any;
  export let isActive: boolean = false;
  let avatar: IAvatar | undefined = undefined;
  let parentHierarchy: any[] = [];
  onMount(async () => {
    avatar = await resolveAvatar();
    if (headingNodeTypes.includes(item.contentType)) {
      parentHierarchy = await resolveNodeParentHierarchy(item.id);
    }
  });
  async function resolveAvatar() {
    if (!item.type?.includes("type:")) {
      return;
    }
    const type = await resolveAssociatedType(item.type);
    return type?.avatar;
  }
  $: resourceType = determineResourceType(item.id);
  $: console.log({ item, resourceType });
</script>

<button
  class={cn("flex w-full justify-between items-center", {
    "h-12": parentHierarchy.length > 0,
    "h-8": parentHierarchy.length == 0
  })}
  on:click
>
  <span class="flex flex-col h-full mo:w-4/5 w-3/4">
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
    <div class="flex gap-2 w-full">
      {#if avatar}
        <span>
          <AvatarView {avatar} size={Size.md} />
        </span>
      {/if}
      <TextWithHoverTooltip
        text={item.label ?? item.body ?? "Untitled"}
        class="text-left truncate w-full"
      />
    </div>
  </span>
  <span class="text-b3 text-fgs3">{properCase(resourceType)}</span>
</button>
