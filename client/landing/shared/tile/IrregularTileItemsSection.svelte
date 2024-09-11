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
  let container: HTMLDivElement;
  let currentIndex = 0;

  function updateCurrentIndex() {
    const children = Array.from(container.children);
    const containerRect = container.getBoundingClientRect();

    children.forEach((child, index) => {
      const childRect = child.getBoundingClientRect();
      if (
        childRect.left >= containerRect.left &&
        childRect.right <= containerRect.right
      ) {
        currentIndex = index;
      }
    });
  }
  function handleScroll(index: number) {
    container.scrollTo({
      left: index * container.clientWidth,
      behavior: "smooth"
    });
  }
  onMount(() => {
    container.addEventListener("scroll", updateCurrentIndex);
    updateCurrentIndex(); // Initial update
  });
</script>

<Section>
  <Title {title} />
  <div
    bind:this={container}
    class="flex gap-x-3 gap-y-1 tp:gap-6 pb-5 overflow-x-scroll tp:px-12 w-full"
  >
    <div class="flex flex-col gap-3">
      {#each list1 as item, index}
        {@const className =
          index == items.length - 1 ? "h-[614px]" : "h-[668px]"}
        <IrregularTileItem {item} class={className} />
      {/each}
    </div>
    <div class="flex flex-col gap-3">
      {#each list2 as item, index}
        {@const className = "h-[638px]"}
        <IrregularTileItem {item} class={className} />
      {/each}
    </div>
  </div>
  <Button
    label="More Products"
    icon="long-arrow-right"
    on:click={() => ($isProductsPanelOpen = true)}
  />
</Section>
