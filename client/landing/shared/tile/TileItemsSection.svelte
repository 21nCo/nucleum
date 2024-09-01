<script lang="ts">
  import type { ITileItem } from "../Landing.types";
  import Section from "../Section.svelte";
  import Title from "../Title.svelte";
  import Button from "../elements/Button.svelte";
  import { isProductsPanelOpen } from "../store/shared.store";
  import TileItem from "./TileItem.svelte";

  export let title: string;
  export let items: ITileItem[];
</script>

<Section>
  <Title {title} />
  <div class="grid grid-cols-1 gap-6 md:grid-cols-2 pb-24">
    {#each items as item}
      <TileItem {item} />
    {/each}
  </div>
  <Button
    label="More Products"
    icon="long-arrow-right"
    on:click={() => ($isProductsPanelOpen = true)}
  />
</Section>
