<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { removeDuplicatesFilter } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { persistenceInstance } from "$lib/client/persistence/persistence";

  const dispatch = createEventDispatcher();
  let searchQuery = "";
  let images: any[] = [];
  let isLoading = false;
  let page = 1;
  let hasMore = true;
  const PER_PAGE = 20;

  async function searchImages(query: string, isNewSearch = true) {
    if (isNewSearch) {
      page = 1;
      images = [];
      hasMore = true;
    }

    if (!hasMore || isLoading) return;

    isLoading = true;
    try {
      const data = await persistenceInstance.browseUnsplash({
        query,
        page,
        perPage: PER_PAGE
      });
      const newImages = query ? data.results : data;

      if (newImages.length < PER_PAGE) {
        hasMore = false;
      }

      const _images = isNewSearch ? newImages : [...images, ...newImages];
      images = _images.filter(removeDuplicatesFilter);
      page++;
    } catch (error) {
      console.error("Error fetching images from Unsplash:", error);
    } finally {
      isLoading = false;
    }
  }

  function handleScroll(e: Event) {
    const target = e.target as HTMLElement;
    const bottom =
      target.scrollHeight - target.scrollTop - target.clientHeight < 50;

    if (bottom && !isLoading && hasMore) {
      searchImages(searchQuery, false);
    }
  }

  async function handleImageSelect(image: any) {
    dispatch("select", `unsplash_${image.urls.raw}`);
    requestIdleCallback(async () => {
      await persistenceInstance.triggerUnsplashDownload({
        url: image.links.download_location
      });
    });
  }

  searchImages("");
</script>

<div class="flex flex-col gap-4 h-full">
  <div class="flex items-center gap-2">
    <TextInput
      bind:value={searchQuery}
      style={InputStyle.BORDERED}
      size={Size.sm}
      placeholder="Search Unsplash photos..."
      on:debouncedChange={() => searchImages(searchQuery)}
    />
    {#if isLoading}
      <Icon icon="svg-spinners:90-ring-with-bg" class="stroke-fgs1" />
    {/if}
  </div>

  {#if images.length === 0 && !isLoading}
    <div class="flex-1 flex items-center justify-center">
      <EmptyStatusView subText="No images found" />
    </div>
  {:else}
    <div
      class="grid mo:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 overflow-y-auto min-h-0 flex-1 p-2"
      on:scroll={handleScroll}
    >
      {#each images as image (image.id)}
        <button
          class="relative mo:h-32 h-52 group overflow-hidden rounded-md notouch:hover:opacity-90 touch:flex touch:flex-col transition-opacity"
          on:click={() => handleImageSelect(image)}
        >
          <img
            src={image.urls.small}
            alt={image.alt_description || "Unsplash photo"}
            class="w-full notouch:h-full touch:flex-1 touch:min-h-0 object-cover"
          />
          <button
            class="notouch:absolute bottom-0 inset-x-0 p-2 notouch:bg-bgs2 text-fgs2 text-b3 notouch:opacity-0 notouch:group-hover:opacity-100 notouch:transition-opacity notouch:hover:underline touch:underline truncate"
            on:click={() => {
              const url =
                image.user.links.html +
                `?utm_source=${$appStore.product ?? "21n"}&utm_medium=referral`;
              appStore.openLink(url);
            }}
          >
            by {image.user.name}
          </button>
        </button>
      {/each}
      <ScrollViewBottomSpacer />
    </div>
  {/if}
</div>
