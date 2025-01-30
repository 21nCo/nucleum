<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { onMount } from "svelte";
  import Records from "$lib/client/components/record/Records.svelte";
  import EmptyStatusView from "../feedback/EmptyStatusView.svelte";
  import TextInput from "../input/TextInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Size } from "$lib/client/types/size.enum";
  import Icon from "../Icon.svelte";
  import { recentsStore } from "$lib/client/components/record/recent.store";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { SearchStore } from "$lib/client/components/record/record.store";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";

  const searchStore = new SearchStore(Resource.node);
  let isLoading = false;
  let searchQuery = "";
  let imageNodes: any[] = [];
  onMount(async () => {
    imageNodes = await refresh();
  });
  function refresh() {
    try {
      isLoading = true;
      if (searchQuery) {
        return searchStore.select({
          searchQuery,
          filters: {
            contentType: NodeType.IMAGE
          }
        });
      } else {
        const recentNodes = recentsStore.resolve({ type: Resource.node });
        return recentNodes.filter(
          (node) => node.contentType === NodeType.IMAGE
        );
      }
    } catch (error) {
      console.error("Error fetching images from library:", error);
      return [];
    } finally {
      isLoading = false;
    }
  }

  async function handleSearch(e: Event) {
    imageNodes = await refresh();
  }
</script>

<div class="flex flex-col gap-4 h-full">
  <div class="flex items-center gap-2">
    <TextInput
      bind:value={searchQuery}
      style={InputStyle.BORDERED}
      size={Size.sm}
      placeholder="Search Image nodes from library..."
      on:debouncedChange={handleSearch}
    />
    {#if isLoading}
      <Icon icon="svg-spinners:90-ring-with-bg" class="stroke-fgs1" />
    {/if}
  </div>
  {#if imageNodes.length > 0}
    <div class="flex overflow-auto">
      <Records
        resource={Resource.node}
        accessPoint={ResourceAccessPoint.PICKER}
        arrangement={Arrangement.GRID}
        data={imageNodes}
        isPreventDefault={true}
        on:click
      />
    </div>
  {:else}
    <div class="flex flex-1 w-full items-center justify-center">
      <EmptyStatusView subText="No images found from library" />
    </div>
  {/if}
</div>
