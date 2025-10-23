<script lang="ts">
  import { Arrangement, Orientation } from "@21n/types/direction.enum";
  import { createEventDispatcher } from "svelte";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  import { popover } from "@21n/actions/popover.action";
  import ArrangementSelectorPopover from "@21n/components/collection/arrangementSelector/ArrangementSelectorPopover.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";

  const dispatch = createEventDispatcher();

  export let arrangement: Arrangement;
  export let resource: Resource | undefined = undefined;
  export let density = 1;
  export let isHideThumbnailPreview: boolean = false;
  export let isHideThumbnailTitle: boolean = false;
  export let isBoardContext = false;

  let isPopoverVisible = false;
  let ref: HTMLElement | null = null;

  let allArrangements = [
    {
      value: Arrangement.LIST,
      label: "List",
      icon: "list"
    },
    {
      value: Arrangement.GRID,
      label: "Grid",
      icon: "grid"
    }
  ];
  $: if (
    !isBoardContext &&
    (!resource || resource === Resource.node) &&
    !allArrangements.find((a) => a.value === Arrangement.MASONRY)
  ) {
    allArrangements.push({
      value: Arrangement.MASONRY,
      label: "Masonry",
      icon: "ph:gradient-light"
    });
  } else {
    allArrangements = allArrangements.filter(
      (a) => a.value !== Arrangement.MASONRY
    );
  }

  function resolveIcon(arrangement: Arrangement) {
    return allArrangements.find((a) => a.value === arrangement)?.icon ?? "";
  }
  function onDensityChange(density: number) {
    dispatch("densityChange", density);
  }
  function onArrangementChange(event: CustomEvent) {
    dispatch("arrangementChange", event.detail);
    // if (event.detail !== Arrangement.MASONRY) {
    //   ref?.dispatchEvent(new CustomEvent("hide"));
    // }
  }

  function onPreviewSettingChange(e: CustomEvent) {
    dispatch("previewSettingChange", e.detail);
  }
  function onTitleSettingChange(e: CustomEvent) {
    dispatch("titleSettingChange", e.detail);
  }
</script>

<div
  class="flex gap-3"
  bind:this={ref}
  use:popover={{
    content: ArrangementSelectorPopover,
    id: "arrangement-selector-popover",
    componentProps: {
      density,
      arrangement,
      isHideThumbnailPreview,
      isHideThumbnailTitle,
      allArrangements,
      resource,
      onArrangementChange,
      onDensityChange,
      onPreviewSettingChange,
      onTitleSettingChange
    }
  }}
  on:change={(e) => {
    isPopoverVisible = e.detail?.open;
  }}
>
  <Toggle icon={resolveIcon(arrangement)} bind:on={isPopoverVisible} />
</div>
