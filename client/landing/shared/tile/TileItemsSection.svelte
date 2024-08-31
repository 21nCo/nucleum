<script lang="ts">
  import type { ITileItem } from "../Landing.types";
  import Section from "../Section.svelte";
  import Title from "../Title.svelte";
  import Button from "../elements/Button.svelte";
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
    href="https://docs.blanklabs.org/soft"
    icon="long-arrow-right"
  />
</Section>
