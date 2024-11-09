<script lang="ts">
  import { Arrangement, Orientation } from "$lib/client/types/direction.enum";
  import { createEventDispatcher } from "svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { popover } from "$lib/client/actions/popover.action";
  import ArrangementSelectorPopover from "./ArrangementSelectorPopover.svelte";

  const dispatch = createEventDispatcher();

  export let arrangement: Arrangement;
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
      icon: "ph:list-thin"
    },
    {
      value: Arrangement.GRID,
      label: "Grid",
      icon: "ph:squares-four-thin"
    }
  ];
  $: if (
    !isBoardContext &&
    !allArrangements.find((a) => a.value === Arrangement.MASONRY)
  ) {
    allArrangements.push({
      value: Arrangement.MASONRY,
      label: "Masonry",
      icon: "ph:gradient-thin"
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
    componentProps: {
      density,
      arrangement,
      isHideThumbnailPreview,
      isHideThumbnailTitle,
      allArrangements,
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
