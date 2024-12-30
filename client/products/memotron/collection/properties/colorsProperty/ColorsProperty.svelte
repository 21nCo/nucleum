<script lang="ts">
  import { tooltip } from "$lib/client/actions/popover.action";
  import { toasts } from "$lib/client/stores/notification.store";
  import { rgbToHex } from "$lib/client/utils/ui.utils";
  import { copyToClipboard } from "$lib/client/utils/utils";

  export let colors: string[] | undefined = [];
</script>

<div class="flex flex-wrap gap-2 w-full items-start">
  {#if colors && colors.length > 0}
    {#each colors as color}
      {@const hex = rgbToHex(color)}
      <button
        class="w-8 h-8 border border-brs2 rounded-md"
        style={`background-color: ${color}`}
        use:tooltip={{
          text: hex
        }}
        on:click={() => {
          copyToClipboard(hex);
          toasts.success(`Copied ${hex} to clipboard!`);
        }}
      />
    {/each}
  {:else}
    NA
  {/if}
</div>
