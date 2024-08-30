<script lang="ts">
  import type { IItem } from "../Landing.types";
  import Section from "../Section.svelte";
  import Item from "./Item.svelte";
  import Title from "../Title.svelte";
  import Button from "../elements/Button.svelte";
  export let title: string;
  export let items: IItem[];
</script>

<Section>
  <Title {title} />
  <div class="grid grid-cols-1 gap-x-28 gap-y-20 md:grid-cols-2 pb-24">
    {#each items as item}
      <Item {item} />
    {/each}
  </div>
  <Button
    label="White paper"
    href="https://docs.blanklabs.org/soft"
    icon="long-arrow-right"
  />
</Section>
