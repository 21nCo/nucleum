<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import {
    BarStyle,
    PanelSwitcherStyle,
    type PanelSwitcherEditModeOptions
  } from "$lib/client/types/switcher.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import PanelSwitcherItemLabel from "./PanelSwitcherItemLabel.svelte";
  const dispatch = createEventDispatcher();
  export let item: ISelectItem;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let isActive: boolean = false;
  export let isDisabled: boolean = false;
  export let style: PanelSwitcherStyle = PanelSwitcherStyle.DEFAULT;
  export let isInEditMode: boolean = false;
  export let barStyle: BarStyle = BarStyle.EXACT;
  export let editModeOptions: PanelSwitcherEditModeOptions | undefined =
    undefined;
  export let triggerItemEdit: string | null = null;
  export let isInversePlacement: boolean = false;
  export let parentBgIndex: number = 1;
  export let isShowNumberShortcut: boolean = false;
  export let index: number = 0;

  let itemRef: HTMLButtonElement | null = null;
  let reArrangeThreshold = 30;
  let isDragging: boolean = false;
  let startX: number | null = null;
  let prevTranslateX = 0;
  let translateX = 0;
  let rafId: number | null = null;
  let lastMouseX: number | null = null;
  let isFloatingToDestinationMode = false;
  let displacement = 0;
  let offsetX = 0;
  let prevMoveDirection: "forward" | "backward" | null = null;
  let moveDirection: "forward" | "backward" | null = null;

  onMount(() => {
    console.log("PanelSwitcherItem onMount", item.label);
  });

  function onClick() {
    if (item.value === "$add") {
      dispatch("add");
    } else {
      dispatch("click", item.value);
    }
  }

  function onMouseDown(e: MouseEvent) {
    console.log("onMouseDown", e);
    isDragging = true;
    isFloatingToDestinationMode = false;
    startX = e.clientX;
    lastMouseX = startX;
    const left = itemRef?.getBoundingClientRect().left ?? 0;
    offsetX = e.clientX - left;
    // mouseOffset = e.
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(updatePosition);
  }

  function handleMouseMove(event: MouseEvent) {
    lastMouseX = event.clientX;
  }

  function updatePosition() {
    if (isDragging && startX !== null && lastMouseX !== null) {
      translateX = lastMouseX - startX;

      if (!isFloatingToDestinationMode) {
        displacement = translateX;
      }
      if (
        Math.abs(displacement) > reArrangeThreshold &&
        !isFloatingToDestinationMode
      ) {
        dispatch("rearrange", displacement);
        isFloatingToDestinationMode = true;
        setTimeout(() => {
          const left = itemRef?.getBoundingClientRect().left ?? 0;
          console.log({ left });
          startX = left + offsetX;
          prevTranslateX = lastMouseX - startX;
        }, 1);
      }
      if (prevTranslateX < translateX) {
        moveDirection = "forward";
      } else if (prevTranslateX > translateX) {
        moveDirection = "backward";
      }
      if (
        prevTranslateX * translateX < 0 ||
        prevMoveDirection !== moveDirection
      ) {
        isFloatingToDestinationMode = false;
      }
      prevTranslateX = translateX;
      prevMoveDirection = moveDirection;
      // console.log({
      //   translateX,
      //   startX,
      //   lastMouseX,
      //   displacement,
      //   moveDirection
      // });
      rafId = requestAnimationFrame(updatePosition);
    }
  }

  function handleMouseUp() {
    isDragging = false;
    dispatch("rearranged", displacement);
    isFloatingToDestinationMode = false;
    translateX = 0;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    if (rafId) cancelAnimationFrame(rafId);
  }
</script>

<!-- TODO - svelte 5 snippets for PanelSwitcherItemLabel multiple references -->
{#if style === PanelSwitcherStyle.BAR}
  <button
    class={cn("flex relative bg-transparent", {
      "px-4":
        (size === Size.md || size === Size.lg) &&
        barStyle === BarStyle.OVERFLOW &&
        !item.icon,
      "px-3": size === Size.sm || (barStyle != BarStyle.OVERFLOW && !item.icon),
      "px-5": item.icon,
      "px-2": size === Size.xs,
      "py-2": barStyle != BarStyle.EXACT,
      "border-b-2": barStyle === BarStyle.OVERFLOW,
      "border-ccs1": isActive && barStyle === BarStyle.OVERFLOW,
      "border-transparent": !isActive && barStyle === BarStyle.OVERFLOW,
      "absolute z-10": isDragging
    })}
    style="transform: translateX({translateX}px);"
    on:click={onClick}
    disabled={isDisabled}
    bind:this={itemRef}
    on:mousedown={onMouseDown}
  >
    <div
      class={cn("flex items-center min-w-fit", {
        "text-base": (size === Size.md && $view.isPortrait) || size === Size.sm,
        "text-b2": (size === Size.sm && $view.isPortrait) || size === Size.xs,
        "text-h4": size === Size.lg,
        "text-fgs3": !isActive,
        "text-ccs1": isActive && !isInEditMode,
        "py-2": barStyle === BarStyle.EXACT,
        "border-b-2": barStyle === BarStyle.EXACT && !isInversePlacement,
        "border-t-2": barStyle === BarStyle.EXACT && isInversePlacement,
        "border-ccs1": isActive && barStyle === BarStyle.EXACT,
        "border-transparent": !isActive && barStyle === BarStyle.EXACT
      })}
    >
      <PanelSwitcherItemLabel
        {item}
        {isInEditMode}
        {editModeOptions}
        {size}
        {isActive}
        {isDisabled}
        {isShowNumberShortcut}
        {index}
        bind:triggerItemEdit
        on:remove
        on:change
      />
    </div>
    {#if isActive && (barStyle === BarStyle.UNDER || barStyle === BarStyle.DOT)}
      <div
        class={cn("absolute bottom-0", {
          "bg-ccs1 left-1/2 w-1 h-1 rounded-full": barStyle === BarStyle.DOT,
          "border-b-2 border-ccs1 left-1/3 w-1/3": barStyle === BarStyle.UNDER
        })}
      />
    {/if}
  </button>
{:else if style === PanelSwitcherStyle.SNAKE}
  <button
    class={cn("relative flex items-center gap-1 py-2", {
      "px-6": item.icon,
      "px-4": !item.icon,
      "border border-brs3 rounded-t-md text-fgs1": isActive,
      "border-ccs1- text-ccs1": isActive && !isInEditMode,
      "border border-transparent text-fgs3": !isActive
    })}
    disabled={isDisabled}
    on:click={onClick}
  >
    <PanelSwitcherItemLabel
      {item}
      {isInEditMode}
      {editModeOptions}
      {size}
      {isActive}
      {isDisabled}
      {isShowNumberShortcut}
      {index}
      bind:triggerItemEdit
      on:remove
      on:change
    />
    {#if isActive}
      <div class="absolute h-1 w-full bg-bgs1 -bottom-1 left-0" />
    {/if}
  </button>
{:else if style === PanelSwitcherStyle.DOT}
  <button class="relative min-w-fit" on:click disabled={isDisabled}>
    <div
      class="{size === Size.sm
        ? 'text-b2'
        : size === Size.md
          ? 'text-base'
          : $view.isPortrait
            ? 'text-h4'
            : 'text-h3'} {isActive ? 'text-ccs1' : 'text-fgs3'}"
    >
      {item.label}
    </div>
    {#if isActive}
      <div
        class="absolute opacity-80 w-1 h-1 -bottom-1 rounded-full bg-ccs1"
        style="left: 40%;"
      />
    {/if}
  </button>
{:else if style === PanelSwitcherStyle.TRAIN}
  <button
    class={cn("relative min-w-fit", {
      "rounded-full px-6 py-3": size === Size.md,
      "rounded-md px-3 py-1 w-24": size === Size.sm,
      "rounded-md px-2 py-0.5 w-16": size === Size.xs,
      "bg-ccs1 text-abg": isActive
    })}
    on:click={onClick}
    disabled={isDisabled}
  >
    <div
      class={cn("flex gap-1 justify-center items-center", {
        "text-base font-medium": size === Size.md && $view.isPortrait,
        "text-b2": size === Size.sm || size === Size.xs
      })}
    >
      <PanelSwitcherItemLabel
        {item}
        {isInEditMode}
        {editModeOptions}
        {size}
        {isActive}
        {isDisabled}
        {isShowNumberShortcut}
        {index}
        bind:triggerItemEdit
        on:remove
        on:change
      />
    </div>
  </button>
{/if}
