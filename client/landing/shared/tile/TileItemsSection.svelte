<script lang="ts">
  import { onMount } from "svelte";
  import type { ITileItem } from "../landing.type";
  import Section from "../Section.svelte";
  import Title from "../Title.svelte";
  import Button from "../elements/Button.svelte";
  import { isProductsPanelOpen } from "../store/shared.store";
  import TileItem from "./TileItem.svelte";
  import Indicator from "./Indicator.svelte";
  import view from "$lib/client/stores/view.store";

  export let title: string;
  export let items: ITileItem[];

  const dev_isShowSeeAllButton = false;

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
    class="no-scrollbar flex gap-3 tp:gap-6 landscape:grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] 2k:grid-cols-[repeat(auto-fill,minmax(500px,1fr))] overflow-x-scroll tp:px--12 w-full snap-mandatory snap-x -mt-6"
  >
    {#each items as item}
      <TileItem {item} class="snap-always snap-start" />
    {/each}
  </div>
  {#if $view.isPortrait}
    <div class="flex gap-2 pb-10 -mt-[38px]">
      {#each items as item, index}
        {#if index === currentIndex}
          <Indicator class="bg-fgs4" />
        {:else}
          <Indicator
            on:click={() => {
              handleScroll(index);
            }}
            class="bg-bgs4"
          />
        {/if}
      {/each}
    </div>
  {/if}
  {#if dev_isShowSeeAllButton}
    <Button
      label="See all products"
      icon="ph:arrow-right"
      on:click={() => {
        setTimeout(() => {
          $isProductsPanelOpen = true;
        }, 100);
      }}
    />
  {/if}
</Section>
