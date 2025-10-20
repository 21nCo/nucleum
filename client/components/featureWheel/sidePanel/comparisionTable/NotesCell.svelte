<script lang="ts">
  import { bottomModal } from "@21n/components/bottomModal/bottomModal.store";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import type {
    IContemporary,
    IFwFeature
  } from "@21n/types/featureWheel.type";
  import { properCase } from "@21n/shared-utils/text.utils";
  export let notes: string | Record<string, string> | undefined = undefined;
  export let isShort: boolean = false;
  export let contemporary: IContemporary;
  export let feature: IFwFeature;
  function resolveNotesText() {
    if (typeof notes === "string") {
      return notes;
    }
    if (typeof notes !== "object") return "";
    if (!feature.ratingCriteria) {
      return Object.values(notes).join("\n\n");
    }
    const notesItems = Object.entries(notes).map(([key, value]) => {
      const ratingCriteria = feature.ratingCriteria?.find(
        (r) => r.slug === key
      );
      return `**${ratingCriteria?.label ?? key}**: ${value}`;
    });
    return notesItems.join("\n\n");
  }
</script>

{#if notes}
  <button
    class={cn("cursor-pointer text-fgs3 text-b3 hover:text-fgs1 relative", {
      "underline-dotted": !isShort,
      "flex justify-center items-center": isShort
    })}
    on:click={() => {
      bottomModal.open("notes", {
        notes: resolveNotesText(),
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
