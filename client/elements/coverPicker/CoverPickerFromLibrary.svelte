<script lang="ts">
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { onMount } from "svelte";
  import Records from "@21n/components/record/Records.svelte";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import { Size } from "@21n/types/size.enum";
  import Icon from "@21n/elements/Icon.svelte";
  import { recentsStore } from "@21n/components/record/recent.store";
  import { NodeType } from "@21n/products/memotron/node/node.type";
  import { SearchStore } from "@21n/components/record/record.store";
  import { Arrangement } from "@21n/types/direction.enum";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";

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
