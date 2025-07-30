<script lang="ts">
  import { bottomModal } from "$lib/client/components/bottomModal/bottomModal.store";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IContemporary } from "$lib/client/types/featureWheel.type";
  import { properCase } from "$lib/shared/utils/text.utils";
  export let notes: string | undefined = undefined;
  export let isShort: boolean = false;
  export let contemporary: IContemporary;
</script>

{#if notes}
  <button
    class={cn("cursor-pointer text-fgs3 text-b3 hover:text-fgs1 relative", {
      "underline-dotted": !isShort,
      "flex justify-center items-center": isShort
    })}
    on:click={() => {
      bottomModal.open("notes", {
        notes,
        title: `Notes for ${properCase(contemporary.label)}`
      });
    }}
  >
    {#if isShort}
      <Icon icon="note" size={Size.sm} />
    {:else}
      See notes
    {/if}
  </button>
{:else}
  <span class="text-fgs4"> - </span>
{/if}
