<script lang="ts">
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { fade } from "svelte/transition";
  import { CaptureMethod } from "../capture.type";
  import { createEventDispatcher } from "svelte";
  import view from "$lib/client/stores/view.store";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import {
    isSameResource,
    removeDuplicatesFilter,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  const dispatch = createEventDispatcher();

  export let item: ISelectItem & { isShortcut?: boolean };
  export let isBoxed: boolean = false;
  export let isActive: boolean = false;

  let inputRef: HTMLInputElement;
  $: size = isBoxed ? Size.lg : $view.isConstrainedWidth ? Size.sm : Size.md;

  function handleCapture(e: Event) {
    dispatch("capture", e);
  }

  function handleClick(e: MouseEvent) {
    if (
      item.value === CaptureMethod.UPLOAD &&
      $context.isEmbed &&
      $context.os === OperatingSystem.IOS
    ) {
      inputRef?.click();
      return;
    }
    const val = item.value;
    if (typeof val !== "string") return;
    let recents = uiState.getState(UIState.captureShortcutRecents);
    if (recents && recents.some(resourceInList(val))) {
      recents = recents.filter((x: string) => !isSameResource(x, val));
      recents.unshift(val);
    } else if (recents) {
      recents.unshift(val);
    } else {
      recents = [val];
    }
    recents = recents.filter(removeDuplicatesFilter);
    uiState.setState(UIState.captureShortcutRecents, recents);
    dispatch("select", val);
  }
</script>

<button
  class={cn(
    "flex gap-1 dp:gap-2 items-center justify-center",
    {
      "bg-aps3 border-aps1 text-aps1": isActive,
      "flex flex-col items-center justify-center gap-2 w-full h-24 px-1.5":
        isBoxed,
      "notouch:hover:bg-bgs2 active:bg-bgs2 bg-bgs1": isBoxed && !isActive,
      "px-3 dp:px-5 h-14 dp:h-16 rounded-md border": !isBoxed
    },
    !isBoxed && {
      "border-brs3 notouch:hover:bg-bgs2 active:bg-bgs2": !isActive,
      "bg-bgs2 bg-opacity-50 notouch:hover:bg-opacity-100 active:bg-opacity-100":
        item.isShortcut && !isActive
    }
  )}
  data-value={item.value}
  on:click={handleClick}
  in:fade
>
  {#if item.value === CaptureMethod.UPLOAD && $context.isEmbed && $context.os === OperatingSystem.IOS}
    <input
      bind:this={inputRef}
      type="file"
      accept="*"
      on:change={handleCapture}
      on:cancel
      id="nativeFileInput"
      class="hidden"
    />
  {/if}
  {#if item.icon && typeof item.icon === "object"}
    <AvatarRenderer avatar={item.icon} {size} />
  {:else if (item.icon && typeof item.icon === "string") || isBoxed}
    <Icon
      icon={item.icon ?? "cube"}
      {size}
      class={cn(
        {
          "text-fgs1": isBoxed
        },
        !isBoxed && {
          "fill-aps1": isActive && !item.isDisabled,
          "stroke-fgs1": !isActive && !item.isDisabled,
          "stroke-fgs3": item.isDisabled
        }
      )}
    />
  {/if}
  <div
    class={cn("whitespace-nowrap truncate userdata", {
      "text-b3 dp:text-b2 text-fgs1 w-full": isBoxed,
      "text-b2 dp:text-base": !isBoxed
    })}
  >
    {item.label ?? enumToString(item.value)}
  </div>
</button>
