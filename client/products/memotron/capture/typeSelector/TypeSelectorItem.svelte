<script lang="ts">
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { CaptureType } from "../capture.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let item: ISelectItem;
  export let size: Size.md | Size.lg = Size.md;
  export let isActive: boolean = false;
  let inputRef: HTMLInputElement;
  function handleCapture(e: Event) {
    dispatch("capture", e);
  }
</script>

<button
  class={cn(
    "flex gap-2 items-center justify-center px-6 py-4 rounded-md border",
    {
      "bg-aps3 border-aps1 text-aps1": isActive,
      "border-brs3 hover:bg-bgs2": !isActive
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
  <div class="whitespace-nowrap truncate">
    {item.label ?? enumToString(item.value)}
  </div>
</button>
