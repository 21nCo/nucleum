<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";

  export let count: number = 0;
  export let label: string | undefined = undefined;
  export let icon: string | undefined = undefined;
  let fullLabel: string = count.toString() + (label ? " " + label : "");
  if (count > 99) fullLabel = "99+ " + (label ? " " + label : "");
</script>

<span
  class="flex items-center justify-center gap-1 px-1 py-0.5 rounded-md bg-bgs3 min-w-6"
>
  {#if icon}
    <Icon {icon} size={Size.sm} class="stroke-fgs3" />
  {/if}
  <span class="text-b3 text-fgs2 default-typeface">{fullLabel}</span>
</span>
