<script lang="ts">
  import FileView from "$lib/client/components/files/FileView.svelte";
  import context from "$lib/client/stores/context.store";
  import { AvatarType, type IAvatar } from "$lib/client/types/avatar.type";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import "@fontsource/noto-color-emoji";
  import Icon from "../Icon.svelte";
  export let avatar: IAvatar;
  export let isHoverDisabled = true;
  export let isHoverEnabled = false;
  export let size: Size | number;
  export let dev_iOSTempRatingFallback = false;
  $: fontSize =
    typeof size === "number"
      ? `${size}px`
      : size === Size.lg
        ? "1.5rem"
        : size === Size.md
          ? "1.25rem"
          : "1rem";

  //@Arv Finlize whether to use on:mouseenter and on:mouseleave or hover, hover's inherent action appears laggy, if current hover action itself is good enough please remove this as unused
  function handleMouseEnter(e: any) {
    if (isHoverDisabled) return;
    const target = e.target as HTMLElement;
    if (target instanceof HTMLImageElement) {
      target.classList.add("h-40");
      target.classList.add("w-40");
      target.classList.add("aspect-square");
    } else target.style.fontSize = "3rem";
  }
  function handleMouseLeave(e: any) {
    if (isHoverDisabled) return;
    const target = e.target as HTMLElement;
    if (target instanceof HTMLImageElement) {
      target.classList.remove("h-40");
      target.classList.remove("w-40");
      target.classList.remove("aspect-square");
    } else target.style.fontSize = fontSize;
  }
</script>

{#if "file" in avatar && avatar.file}
  <FileView
    id={avatar.file}
    class={cn(isHoverEnabled && "hover:scale-[1.2] transition-transform", {
      "w-4 h-4": size === Size.sm,
      "w-6 h-6": size === Size.md,
      "w-8 h-8": size === Size.lg
    })}
  />
  <!-- <img
    src={avatar.file}
    alt={avatar.name}
    class={cn(isHoverEnabled && "hover:scale-[1.2] transition-transform")}
  /> -->
{:else if "code" in avatar && avatar.code}
  {#if avatar.type === AvatarType.ICON}
    {#if dev_iOSTempRatingFallback}
      <Icon icon={avatar.isFilled ? "ph:star-fill" : "ph:star"} />
    {:else}
      <span
        class={cn(
          "material-symbols-rounded",
          isHoverEnabled && "hover:scale-[1.2] transition-transform",
          avatar.color === "bw" && "text-fgs2"
        )}
        style="font-variation-settings: 'FILL' {avatar?.isFilled
          ? 1
          : 0}, 'wght'
      700, 'GRAD' 0, 'opsz' 48; color:{avatar?.color !== 'bw'
          ? avatar?.color
          : ''}; font-size: {fontSize};"
      >
        {@html avatar.code}
      </span>
    {/if}
  {:else if avatar.type === AvatarType.EMOJI && avatar.code}
    <span
      class={cn(
        $context.os !== OperatingSystem.IOS &&
          $context.os !== OperatingSystem.MACOS &&
          "noto-color-emoji-mod",
        isHoverEnabled && "hover:scale-[1.2] transition-transform"
      )}
      style="font-size: {fontSize};"
    >
      {@html avatar.code}
    </span>
  {/if}
{/if}
<svelte:head>
  <link
    href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji+Compat&display=swap"
    rel="stylesheet"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
    rel="stylesheet"
  />
</svelte:head>
