<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import CoverRenderer from "$lib/client/elements/coverPicker/CoverRenderer.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import ToggleGroup from "$lib/client/elements/toggle/ToggleGroup.svelte";
  import type { ICoverLayout } from "./collection.type";
  import { Placement } from "$lib/client/types/direction.enum";
  import { hoverable } from "$lib/client/actions/hover.action";
  import type { IImageRepositionerOptions } from "$lib/client/components/files/file.type";
  import { resizable } from "$lib/client/actions/resize.action";
  import view from "$lib/client/stores/view.store";

  const dispatch = createEventDispatcher();
  export let cover: string | undefined = undefined;
  export let placement: Placement = Placement.Top;
  export let position: { x?: number; y?: number } = {};
  export let size: { width?: number; height?: number } = {};
  export let dev_isRoundedCover = false;
  export let isInEditMode = false;
  export let isCoverPickerOpen = false;
  export let isHovered = false;
  export let isConstrainedWidth: boolean = false;

  $: isPositionable = cover?.toString().includes("file:") && isInEditMode;

  $: height = isConstrainedWidth ? 100 : (size?.height ?? $view.height / 5);

  function onReplace(e: CustomEvent) {
    isCoverPickerOpen = true;
    dispatch("pick");
    if (e.detail) e.detail.stopPropagation();
  }

  function onClose(e: CustomEvent) {
    isCoverPickerOpen = false;
    if (e.detail) e.detail.stopPropagation();
  }

  function onRemove(e: CustomEvent) {
    cover = undefined;
    dispatch("change", cover);
    if (e.detail) e.detail.stopPropagation();
  }

  function onClick(e: MouseEvent) {
    if (!cover) {
      isCoverPickerOpen = true;
      dispatch("pick");
    }
    e.stopPropagation();
  }

  function onPlacementChange(e: CustomEvent) {
    dispatch("placement", e.detail);
  }

  function onHover(e: MouseEvent) {
    isHovered = e.detail;
  }

  function resolveRespositionParams(
    placement: Placement,
    isPositionable: boolean | undefined
  ): IImageRepositionerOptions {
    if (placement === Placement.Left || placement === Placement.Right) {
      return {
        axis: "x",
        enabled: isPositionable,
        initialPosition: position?.x ?? 50
      };
    } else {
      return {
        axis: "y",
        enabled: isPositionable,
        initialPosition: position?.y ?? 50
      };
    }
  }

  function resolveResizeParams(placement: Placement, isInEditMode: boolean) {
    if (!isInEditMode || !cover)
      return {
        enabled: false
      };
    return {
      enabled: true,
      minWidth: 220,
      minHeight: 100,
      maxWidth: 400,
      maxHeight: 400,
      edges:
        placement === Placement.Top || !placement
          ? ["bottom"]
          : placement === Placement.Right
            ? ["left"]
            : ["right"],
      onResize: onResize
    };
  }

  function onResize(e: any) {
    dispatch("resize", e);
  }
</script>

<!-- TODO - Cover photo popover with upload, from link, solid colors, graphics and unsplash options -->
{#if (cover && !isInEditMode) || isInEditMode}
  <button
    class={cn("relative flex justify-center items-center", {
      "bg-bgs2 bg-opacity-50 cursor-pointer": !cover,
      "border-y border-y-brs3": !cover || isInEditMode,
      "cursor-default": cover,
      "px-4 pt-4": dev_isRoundedCover,
      "h--72 min-h--[18rem] w-full": placement === Placement.Top || !placement,
      "w--72 min-w--[18rem] h-full":
        placement === Placement.Left || placement === Placement.Right,
      "cursor-move": isPositionable
    })}
    style={placement === Placement.Top || !placement
      ? `min-height: ${height}px; max-height: ${height}px;`
      : `min-width: ${size?.width ?? 300}px; max-width: ${size?.width ?? 300}px;`}
    on:click={onClick}
    use:hoverable
    on:hover={onHover}
    use:resizable={resolveResizeParams(placement, isInEditMode)}
  >
    {#if cover}
      <CoverRenderer
        repositionParams={resolveRespositionParams(placement, isPositionable)}
        {cover}
        isLazyLoad={false}
        class={cn({
          "rounded-xl": dev_isRoundedCover
        })}
        on:reposition
      />
    {:else if isInEditMode}
      + Add cover photo
    {/if}
    {#if isInEditMode && cover}
      {#if isPositionable && !isConstrainedWidth}
        <span
          class="absolute flex gap-1 items-center text-fgs1 bg-bgs2 bg-opacity-60 dark:bg-opacity-50 py-1 px-2 rounded-md backdrop-blur-sm dark:backdrop-blur-none"
        >
          <Icon
            icon="ph:arrows-out-cardinal-light"
            class="stroke-fgs1"
            size={Size.sm}
          />
          Pan to reposition</span
        >
      {/if}
      <div
        class={cn(
          "absolute custom--gradient flex w-full justify-end items-center gap-2 bottom-0 right-0 pb-3 pt-4 px-4 cursor-default",
          {
            "flex-col pt-8":
              placement === Placement.Left || placement === Placement.Right
          }
        )}
      >
        <span
          class={cn("flex gap-3", {
            "flex-col":
              placement === Placement.Left || placement === Placement.Right
          })}
        >
          {#if !isConstrainedWidth}
            <span class="flex gap-3 items-center bg-bgs2 rounded-full px-4">
              <span> Layout </span>
              <ToggleGroup
                size={Size.sm}
                selected={placement}
                on:change={onPlacementChange}
                parentBgIndex={2}
                items={[
                  {
                    value: Placement.Left,
                    icon: "ph:align-left-simple-light"
                  },
                  {
                    value: Placement.Top,
                    icon: "ph:align-top-simple-light"
                  },
                  {
                    value: Placement.Right,
                    icon: "ph:align-right-simple-light"
                  }
                ]}
              />
            </span>
          {/if}
          <Button
            label={isCoverPickerOpen ? "Close" : "Replace"}
            icon={isCoverPickerOpen
              ? "ph:x-circle-light"
              : "ph:arrows-clockwise-light"}
            size={Size.sm}
            on:click={isCoverPickerOpen ? onClose : onReplace}
          />
          <Button
            label="Remove"
            icon="ph:trash-light"
            type={ButtonVariant.DANGER}
            size={Size.sm}
            on:click={onRemove}
          />
        </span>
      </div>
    {/if}
  </button>
{/if}

<style>
  .custom-gradient {
    background-image: linear-gradient(
        to top,
        rgba(var(--colors-fgs1), 0.8) 0%,
        rgba(var(--colors-fgs1), 0.7) 10%,
        rgba(var(--colors-fgs1), 0.6) 20%,
        rgba(var(--colors-fgs1), 0.5) 30%,
        rgba(var(--colors-fgs1), 0.4) 40%,
        rgba(var(--colors-fgs1), 0.3) 50%,
        rgba(var(--colors-fgs1), 0.2) 60%,
        rgba(var(--colors-fgs1), 0.15) 70%,
        rgba(var(--colors-fgs1), 0.075) 80%,
        rgba(var(--colors-fgs1), 0.05) 85%,
        rgba(var(--colors-fgs1), 0.025) 90%,
        rgba(var(--colors-fgs1), 0.0125) 92%,
        rgba(var(--colors-fgs1), 0.00625) 94%,
        rgba(var(--colors-fgs1), 0.00312) 96%,
        rgba(var(--colors-fgs1), 0.00078125) 98%,
        rgba(var(--colors-fgs1), 0) 100%
      ),
      repeating-conic-gradient(
        rgba(var(--colors-fgs1), 0.02) 0% 25%,
        transparent 0% 50%
      );
    background-size:
      100% 100%,
      4px 4px;
    background-blend-mode: normal, overlay;
  }
</style>
