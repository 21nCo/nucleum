<script lang="ts">
  import { AvatarType, type IAvatar } from "$lib/client/types/avatar.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let avatar: IAvatar;
  export let size: Size | number;
  $: fontSize =
    typeof size === "number"
      ? `${size}px`
      : size === Size.lg
        ? "1.5rem"
        : size === Size.md
          ? "1.25rem"
          : "1rem";
</script>

{#if "URL" in avatar && avatar.URL}
  <img src={avatar.URL} alt={avatar.name} />
{:else if "code" in avatar}
  {#if avatar.type === AvatarType.ICON}
    <span
      class={cn("material-symbols-rounded", {
        "text-fgs2": avatar.color === "bw"
      })}
      style="font-variation-settings: 'FILL' {avatar?.isFilled
        ? 1
        : 0}, 'wght' 700, 'GRAD' 0, 'opsz' 48; color:{avatar?.color !== 'bw'
        ? avatar?.color
        : ''}; font-size: {fontSize};"
    >
      {@html avatar.code}
    </span>
  {:else if avatar.type === AvatarType.EMOJI}
    <span class="noto-color-emoji--mod" style="font-size: {fontSize};">
      {@html avatar.code}
    </span>
  {/if}
{/if}
