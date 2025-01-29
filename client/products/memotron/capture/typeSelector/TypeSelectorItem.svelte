<script lang="ts">
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { fade, fly } from "svelte/transition";
  import { CaptureType } from "../capture.type";
  import { createEventDispatcher } from "svelte";
  import view from "$lib/client/stores/view.store";
  const dispatch = createEventDispatcher();

  export let item: ISelectItem & { isShortcut?: boolean };
  export let isActive: boolean = false;
  let inputRef: HTMLInputElement;
  $: size = $view.isConstrainedWidth ? Size.sm : Size.md;
  function handleCapture(e: Event) {
    dispatch("capture", e);
  }
</script>

<button
  class={cn(
    "flex gap-1 dp:gap-2 items-center justify-center px-3 dp:px-5 h-14 dp:h-16 rounded-md border",
    {
      "bg-aps3 border-aps1 text-aps1": isActive,
      "border-brs3 notouch:hover:bg-bgs2 active:bg-bgs2": !isActive,
      "bg-bgs2 bg-opacity-50 notouch:hover:bg-opacity-100 active:bg-opacity-100":
        item.isShortcut && !isActive
    }
  )}
  on:click={(e) => {
    if (
      item.value === CaptureType.UPLOAD &&
      $context.isEmbed &&
      $context.os === OperatingSystem.IOS
    ) {
      inputRef?.click();
    }
    dispatch("click", item.value);
  }}
  in:fade
>
  {#if item.value === CaptureType.UPLOAD && $context.isEmbed && $context.os === OperatingSystem.IOS}
    <input
      bind:this={inputRef}
      type="file"
      accept="*"
      on:change={handleCapture}
      id="nativeFileInput"
      class="hidden"
    />
  {/if}
  {#if item.icon && typeof item.icon === "string"}
    <Icon
      icon={item.icon}
      class={cn({
        "fill-aps1": isActive && !item.isDisabled,
        "stroke-fgs1": !isActive && !item.isDisabled,
        "stroke-fgs3": item.isDisabled
      })}
      {size}
    />
  {:else if item.icon && typeof item.icon === "object"}
    <AvatarRenderer avatar={item.icon} {size} />
  {/if}
  <div class="whitespace-nowrap truncate text-b2 dp:text-base">
    {item.label ?? enumToString(item.value)}
  </div>
</button>
