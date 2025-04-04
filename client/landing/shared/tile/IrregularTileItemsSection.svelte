<script lang="ts">
  import { onMount } from "svelte";
  import type { ITileItem } from "../Landing.types";
  import Section from "../Section.svelte";
  import Title from "../Title.svelte";
  import Button from "../elements/Button.svelte";
  import { isProductsPanelOpen } from "../store/shared.store";
  import IrregularTileItem from "./IrregularTileItem.svelte";

  export let title: string;
  export let items: ITileItem[];
  let list1 = items.slice(0, items.length / 2);
  let list2 = items.slice(items.length / 2, items.length);
</script>

<Section>
  <Title {title} />
  <div
    class="flex mo:flex-col mo:items-center justify-center gap-3 tp:gap-7 tp:px-12 w-full"
  >
    <div class="flex flex-col gap-7">
      {#each list1 as item, index}
        {@const className =
          index == list1.length - 1 ? "h-[486px]" : "h-[414px]"}
        <IrregularTileItem {item} class={className} />
      {/each}
    </div>
    <div class="flex flex-col gap-7">
      {#each list2 as item, index}
        {@const className = "h-[438px]"}
        <IrregularTileItem {item} class={className} />
      {/each}
    </div>
  </div>
  <!-- <Button
    label="More Products"
    icon="long-arrow-right"
    on:click={() => ($isProductsPanelOpen = true)}
  /> -->
</Section>
