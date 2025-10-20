<script lang="ts">
  import type { IGridItem } from "@21n/landing/shared/landing.type";
  import Section from "@21n/landing/shared/Section.svelte";
  import Item from "@21n/landing/shared/grid/Item.svelte";
  import Title from "@21n/landing/shared/Title.svelte";
  import Button from "@21n/landing/shared/elements/Button.svelte";
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
    label="Read our white paper"
    icon="ph:arrow-right"
    href={whitePaperUrl}
  />
</Section>
