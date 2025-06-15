<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import ResourceGridThumbnail from "../../record/thumbnail/ResourceGridThumbnail.svelte";
  import ResourceThumbnailBase from "../../record/thumbnail/ResourceThumbnailBase.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { type ICombinationThumb, CombinationType } from "../combination.type";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import RecordStarStatusFeedback from "../../record/RecordStarStatusFeedback.svelte";
  import { enumToString, properCase } from "$lib/shared/utils/text.utils";

  export let item: ICombinationThumb;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let size: Size.sm | Size.md = Size.md;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let accessPointId: string;
  export let isApplyCustomColor: boolean = false;
  export let isDraggable: boolean = false;
  export let parentBgIndex = 1;
  export let refreshId: number = new Date().getTime();

  function resolveCombinationIcon(type: CombinationType): string {
    switch (type) {
      case CombinationType.SIDENAV:
        return "ph:sidebar-light";
      case CombinationType.WHITEBOARD:
        return "ph:chalkboard-simple-light";
      case CombinationType.MINDMAP:
        return "ph:tree-view-light";
      case CombinationType.TIMELINE:
        return "ph:calendar-blank-light";
      case CombinationType.WALL:
        return "widget";
      default:
        return "ph:stack-light";
    }
  }

  function onCombinationChange(e: any) {
    const data = e.detail?.params?.record;
    if (data) {
      item = { ...item, ...data };
      refreshId = new Date().getTime();
    }
  }
</script>

<ResourceThumbnailBase
  bind:item
  {accessPoint}
  {accessPointId}
  {isDraggable}
  {isApplyCustomColor}
  {arrangement}
  on:action
>
  {#if arrangement === Arrangement.LIST}
    <button
      class="flex items-center h-16 gap-3 w-full rounded-md bg-bgs2 border border-transparent hover:border-bgs2 p-3"
      on:click
    >
      <div
        class="flex items-center justify-center w-10 h-10 rounded-md bg-bgs4"
      >
        <Icon
          icon={resolveCombinationIcon(item.type)}
          size={Size.md}
          class="text-fgs2"
        />
      </div>
      <div class="flex flex-col gap-1 flex-grow">
        <div class="flex items-center gap-2">
          <span class="text-b2 truncate text-left">
            {item.label || "Untitled Combination"}
          </span>
          {#if accessPoint !== ResourceAccessPoint.BROWSER}
            <RecordStarStatusFeedback isStarred={item.isStarred} />
          {/if}
        </div>
        <div class="flex items-center gap-2">
          <span class="text-b3 text-fgs3 truncate text-left">
            {properCase(enumToString(item.type))} combination
          </span>
          {#if item.items && item.items.length > 0}
            <span class="text-b3 text-fgs3">
              • {item.items.length} item{item.items.length === 1 ? "" : "s"}
            </span>
          {/if}
        </div>
      </div>
    </button>
  {:else if arrangement === Arrangement.GRID || arrangement === Arrangement.MASONRY}
    <ResourceGridThumbnail {item} {size} on:click>
      <div class="flex items-center justify-center h-full bg-bgs4">
        <Icon
          icon={resolveCombinationIcon(item.type)}
          size={Size.xl}
          class="text-fgs3"
        />
      </div>
      <slot slot="bottom" name="bottom">
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <span class="text-b2 truncate">
              {item.label || "Untitled Combination"}
            </span>
            {#if accessPoint !== ResourceAccessPoint.BROWSER}
              <RecordStarStatusFeedback isStarred={item.isStarred} />
            {/if}
          </div>
          <div class="flex items-center gap-2">
            <span class="text-b3 text-fgs3">
              {properCase(enumToString(item.type))}
            </span>
            {#if item.items && item.items.length > 0}
              <span class="text-b3 text-fgs3">
                • {item.items.length} item{item.items.length === 1 ? "" : "s"}
              </span>
            {/if}
          </div>
        </div>
      </slot>
    </ResourceGridThumbnail>
  {/if}
</ResourceThumbnailBase>

<ComponentBaseLayer
  subscribeToRecords={[item.id]}
  on:change={onCombinationChange}
/>
