<script lang="ts">
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import ResourceGridThumbnail from "$lib/client/components/record/thumbnail/ResourceGridThumbnail.svelte";
  import ResourceThumbnailBase from "$lib/client/components/record/thumbnail/ResourceThumbnailBase.svelte";
  import {
    ResourceAccessPoint,
    ResourceAccessPointState
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { countNavItems } from "../combination.utils";
  import type { ISideNavCombination } from "../combination.type";

  export let item: ISideNavCombination;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let size: Size.sm | Size.md = Size.md;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let accessPointState: ResourceAccessPointState =
    ResourceAccessPointState.DEFAULT;

  $: counts = countNavItems(item?.items ?? []);
  $: title = item?.label ?? "Untitled combination";

  const pluralize = (count: number, noun: string) =>
    `${count} ${noun}${count === 1 ? "" : "s"}`;

  function onCombinationChange(e: CustomEvent) {
    const data = e.detail?.params?.record;
    if (data) {
      item = { ...item, ...data } as ISideNavCombination;
    }
  }
</script>

<ResourceThumbnailBase bind:item {accessPoint} {arrangement}>
  {#if arrangement === Arrangement.LIST}
    <button
      class="flex items-center gap-3 w-full h-20 rounded-md bg-bgs2 border border-transparent hover:border-bgs3 p-3 text-left"
      on:click
    >
      {#if item?.avatar}
        <AvatarRenderer avatar={item.avatar} size={Size.lg} />
      {:else}
        <div class="flex items-center justify-center w-12 h-12 rounded-md bg-bgs3">
          <Icon icon="combination" size={Size.md} class="stroke-fgs2" />
        </div>
      {/if}
      <div class="flex flex-col flex-grow gap-1 overflow-hidden">
        <div class="flex items-center gap-2">
          <span class="truncate text-b2 font-medium">{title}</span>
          {#if item?.isStarred}
            <Icon icon="star" size={Size.sm} class="stroke-aps1 fill-aps1" />
          {/if}
        </div>
        {#if item?.description}
          <span class="text-b3 text-fgs3 truncate">
            {item.description}
          </span>
        {/if}
        <div class="flex gap-3 text-b3 text-fgs3">
          <span>{pluralize(counts.resources, "resource")}</span>
          {#if counts.sections > 0}
            <span>{pluralize(counts.sections, "section")}</span>
          {/if}
        </div>
      </div>
    </button>
  {:else if arrangement === Arrangement.GRID || arrangement === Arrangement.MASONRY}
    <ResourceGridThumbnail {item} {size} on:click>
      <div class="flex flex-1 items-center justify-center w-full h-full bg-bgs2 rounded-t-md">
        {#if item?.avatar}
          <AvatarRenderer avatar={item.avatar} size={Size.lg} />
        {:else}
          <Icon icon="combination" size={Size.lg} class="stroke-fgs2" />
        {/if}
      </div>
      <div slot="bottom" class="flex flex-col gap-1 w-full">
        <span class="text-b2 font-medium truncate">{title}</span>
        {#if item?.description}
          <span class="text-b3 text-fgs3 truncate">{item.description}</span>
        {/if}
        <div
          class="flex gap-2 text-b3 text-fgs3"
          data-access-point-state={accessPointState}
        >
          <span>{pluralize(counts.resources, "resource")}</span>
          {#if counts.sections > 0}
            <span>{pluralize(counts.sections, "section")}</span>
          {/if}
        </div>
      </div>
    </ResourceGridThumbnail>
  {/if}
</ResourceThumbnailBase>

<ComponentBaseLayer
  subscribeToRecords={[item.id]}
  on:change={onCombinationChange}
  on:syncDown={onCombinationChange}
  on:update={onCombinationChange}
/>
