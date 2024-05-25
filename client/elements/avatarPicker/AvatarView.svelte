<script lang="ts">
  import { AvatarType, type Avatar } from "$lib/client/types/avatar.type";
  import { Size } from "$lib/client/types/size.enum";
  export let avatar: Avatar;
  export let size: Size | number;
  $: fontSize =
    typeof size === "number"
      ? `${size}px`
      : size === Size.lg
        ? "1.6em"
        : size === Size.md
          ? "1.4em"
          : "1.2em";
</script>

{#if "URL" in avatar && avatar.URL}
  <img src={avatar.URL} alt={avatar.name} />
{:else if "code" in avatar}
  {#if avatar.type === AvatarType.ICON}
    <span
      class="material-symbols-rounded"
      style="font-variation-settings: 'FILL' {avatar?.isFilled
        ? 1
        : 0}, 'wght' 700, 'GRAD' 0, 'opsz' 48; color:{avatar?.color}; font-size: {fontSize};"
    >
      {@html avatar.code}
    </span>
  {:else if avatar.type === AvatarType.EMOJI}
    <span class="noto-color-emoji--mod" style="font-size: {fontSize};">
      {@html avatar.code}
    </span>
  {/if}
{/if}
