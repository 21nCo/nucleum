<script lang="ts">
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "../../Icon.svelte";
  export let icon: string;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let label: string | undefined = undefined;
  export let type: ButtonVariant = ButtonVariant.SECONDARY;
  export let style: ButtonStyle = ButtonStyle.DEFAULT;
</script>

<div class="flex flex-col gap-1 items-center justify-center">
  <button
    class={cn(
      "flex items-center justify-center rounded-full notouch:hover:brightness-90 active:brightness-90",
      {
        "w-16 h-16": size === Size.lg,
        "w-14 h-14": size === Size.md,
        "w-10 h-10": size === Size.sm
      },
      style === ButtonStyle.DEFAULT && {
        "bg-aps1": type === ButtonVariant.PRIMARY,
        "bg-ars1": type === ButtonVariant.DANGER,
        "bg-bgs2": type === ButtonVariant.SECONDARY
      },
      style === ButtonStyle.OUTLINED && {
        border: true,
        "border-aps1": type === ButtonVariant.PRIMARY,
        "border-ars1": type === ButtonVariant.DANGER,
        "border-bgs2": type === ButtonVariant.SECONDARY
      }
    )}
    on:click
  >
    <Icon
      {icon}
      {size}
      class={cn(
        style === ButtonStyle.DEFAULT && {
          "text-abg":
            type === ButtonVariant.PRIMARY || type === ButtonVariant.DANGER,
          "text-fgs1": type === ButtonVariant.SECONDARY
        },
        style === ButtonStyle.OUTLINED && {
          "text-aps1": type === ButtonVariant.PRIMARY,
          "text-ars1": type === ButtonVariant.DANGER,
          "text-fgs1": type === ButtonVariant.SECONDARY
        }
      )}
    />
  </button>
  {#if label}
    <p class="text-b3 text-fgs2">{label}</p>
  {/if}
</div>
