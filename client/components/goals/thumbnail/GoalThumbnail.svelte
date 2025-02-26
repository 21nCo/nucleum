<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import ResourceGridThumbnail from "../../record/thumbnail/ResourceGridThumbnail.svelte";
  import ResourceThumbnailBase from "../../record/thumbnail/ResourceThumbnailBase.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { type IGoalThumb } from "../goal.type";
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { resolveGoalTypeIcon } from "../goal.utils";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import RecordStarStatusFeedback from "../../record/RecordStarStatusFeedback.svelte";
  import { activeSession } from "$lib/client/products/pointron/focus/session.store";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";

  export let item: IGoalThumb;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let size: Size.sm | Size.md = Size.md;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let accessPointId: string;
  export let isApplyCustomColor: boolean = false;
  export let isDraggable: boolean = false;
  export let refreshId: number = new Date().getTime();

  $: isCurrentlyFocusing =
    $activeSession.currentFocusItem &&
    isSameResource(item, $activeSession.currentFocusItem) &&
    $activeSession.isQuickStartOn &&
    $activeSession.isSessionRunning;

  let isHovering: boolean = false;

  function onTaskChange(e: any) {
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
  bind:isHovering
  on:action
>
  <CustomColorPropagator color={item.color}>
    {#if arrangement === Arrangement.LIST}
      <div
        class={cn(
          "relative flex flex-col w-full border rounded-md truncate",
          {
            "bg-ccs3 border border-ccs1": isCurrentlyFocusing
          },
          !isCurrentlyFocusing && {
            "bg-ccs5 notouch:hover:bg-ccs4 active:bg-ccs4 border-ccs2":
              isApplyCustomColor,
            "border-transparent notouch:hover:border-brs3 active:border-brs3 px-1":
              !isApplyCustomColor,
            "bg-bgs2 bg-opacity-50 px-2":
              !isApplyCustomColor && accessPoint === ResourceAccessPoint.LIBRARY
          }
        )}
      >
        <button class="flex w-full items-center h-16 truncate" on:click>
          <div class="flex items-center gap-3 p-3 w-full">
            <div class="flex items-center gap-2">
              <Icon
                icon={resolveGoalTypeIcon(item.type)}
                class={cn({
                  "text-ccs1": item.color
                })}
              />
              <!-- {#if item.isCompleted}
              <Icon icon="ph:check-circle-fill" class="text-green-500" />
            {/if} -->
            </div>

            <div class="flex flex-col gap-1 flex-grow">
              <div class="flex items-center gap-2">
                <span class="text-b2 font-medium truncate">{item.label}</span>
                <RecordStarStatusFeedback isStarred={item.isStarred} />
                <!-- {#if item.startDate || item.endDate}
                <span class="text-b3 text-fgs3">
                  {#if item.startDate}
                    {formatDatetime($userPreferences, item.startDate)}
                  {/if}
                  {#if item.endDate}
                    - {formatDatetime($userPreferences, item.endDate)}
                  {/if}
                </span>
              {/if} -->
              </div>
              <span class="text-b3 text-fgs3 truncate text-left">
                {#if isCurrentlyFocusing}
                  Currently focusing...
                {:else if item.description}
                  {@html renderMdAsHtml(
                    typeof item.description.blocks?.[0]?.body === "string"
                      ? item.description.blocks[0].body
                      : ""
                  )}
                {/if}
              </span>
            </div>
          </div>
        </button>
      </div>
    {:else if arrangement === Arrangement.GRID}
      <ResourceGridThumbnail {item} on:click {isApplyCustomColor} {size}>
        <div class="relative flex-1 min-h-0 w-full pt-3 px-3">
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <Icon
                icon={resolveGoalTypeIcon(item.type)}
                class={cn("text-fgs3", {
                  // "text-green-500": item.isCompleted
                })}
              />
              <!-- {#if item.isCompleted}
              <Icon icon="ph:check-circle-fill" class="text-green-500" />
            {/if} -->
            </div>

            {#if item.description}
              <div class="h-full overflow-clip text-b2">
                <span class="text-fgs3 userdata">
                  {@html renderMdAsHtml(
                    typeof item.description.blocks?.[0]?.body === "string"
                      ? item.description.blocks[0].body
                      : ""
                  )}
                </span>
              </div>
            {/if}
          </div>
        </div>

        <div slot="bottom" class="flex flex-col w-full">
          <div class="flex items-center gap-2">
            <span class="text-b2 font-medium truncate">{item.label}</span>
            {#if item.startDate || item.endDate}
              <span class="text-b3 text-fgs3">
                {#if item.startDate}
                  {formatDatetime($userPreferences, item.startDate)}
                {/if}
                {#if item.endDate}
                  - {formatDatetime($userPreferences, item.endDate)}
                {/if}
              </span>
            {/if}
          </div>
        </div>
      </ResourceGridThumbnail>
    {/if}
  </CustomColorPropagator>
</ResourceThumbnailBase>

<ComponentBaseLayer
  subscribeToResource={new Set([Resource.task])}
  subscribeToRecords={[item.id]}
  on:change={onTaskChange}
/>
