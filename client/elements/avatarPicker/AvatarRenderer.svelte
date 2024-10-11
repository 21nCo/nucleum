<script lang="ts">
  import context from "$lib/client/stores/context.store";
  import { AvatarType, type IAvatar } from "$lib/client/types/avatar.type";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let avatar: IAvatar;
  export let isHoverDisabled = true;
  export let isHoverEnabled = false;
  export let size: Size | number;
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

{#if "URL" in avatar && avatar.URL}
  <img
    src={avatar.URL}
    alt={avatar.name}
    class={cn(isHoverEnabled && "hover:scale-[1.2] transition-transform")}
  />
{:else if "code" in avatar}
  {#if avatar.type === AvatarType.ICON}
    <span
      class={cn(
        "material-symbols-rounded",
        isHoverEnabled && "hover:scale-[1.2] transition-transform",
        avatar.color === "bw" && "text-fgs2"
      )}
      style="font-variation-settings: 'FILL' {avatar?.isFilled ? 1 : 0}, 'wght'
      700, 'GRAD' 0, 'opsz' 48; color:{avatar?.color !== 'bw'
        ? avatar?.color
        : ''}; font-size: {fontSize};"
    >
      {@html avatar.code}
    </span>
  {:else if avatar.type === AvatarType.EMOJI}
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
