<script lang="ts">
  import type { IGridItem } from "../Landing.types";
  import Section from "../Section.svelte";
  import Item from "./Item.svelte";
  import Title from "../Title.svelte";
  import Button from "../elements/Button.svelte";
  import { goto } from "$app/navigation";
  import { appStore } from "$lib/client/stores/app.store";
  export let title: string;
  export let items: IGridItem[];
  export let whitePaperUrl: string;
</script>

<Section>
  <Title {title} />
  <div class="grid grid-cols-1 gap-x-28 gap-y-20 mo:gap-y-12 md:grid-cols-2">
    {#each items as item}
      <Item {item} />
    {/each}
  </div>
  <Button
    label="White paper"
    icon="long-arrow-right"
    on:click={() => appStore.openLink(whitePaperUrl)}
  />
</Section>
