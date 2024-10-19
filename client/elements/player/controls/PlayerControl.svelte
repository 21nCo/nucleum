<script lang="ts">
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "../../Icon.svelte";
  export let icon: string;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let label: string | undefined = undefined;
  export let type: ButtonVariant = ButtonVariant.SECONDARY;
</script>

<div class="flex flex-col gap-1 items-center justify-center">
  <button
    class={cn("flex items-center justify-center rounded-full", {
      "w-16 h-16": size === Size.lg,
      "w-14 h-14": size === Size.md,
      "w-12 h-12": size === Size.sm,
      "bg-aps1": type === ButtonVariant.PRIMARY,
      "bg-ars1": type === ButtonVariant.DANGER,
      "bg-bgs2": type === ButtonVariant.SECONDARY
    })}
    on:click
  >
    <Icon
      {icon}
      {size}
      class={cn({
        "stroke-abg":
          type === ButtonVariant.PRIMARY || type === ButtonVariant.DANGER,
        "stroke-fgs1": type === ButtonVariant.SECONDARY
      })}
    />
  </button>
  {#if label}
    <p class="text-b3 text-fgs2">{label}</p>
  {/if}
</div>
