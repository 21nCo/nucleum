<script lang="ts">
  import { onMount } from "svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { page } from "$app/stores";
  import view from "$lib/client/stores/view.store";
  import LibraryRecordsPane from "./LibraryRecordsPane.svelte";
  import { AppSearchParam } from "$lib/client/types/appStore.type";

  export let defaultResource: Resource = Resource.node;

  let selectedResource: Resource = $view.isConstrainedWidth
    ? Resource.unknown
    : defaultResource;
  let recordsPaneRef: LibraryRecordsPane;

  onMount(() => {
    const pageSub = page.subscribe(async (p) => {
      const resourceParam = p.url.searchParams.get(AppSearchParam.RESOURCE);
      if (resourceParam && resourceParam !== selectedResource) {
        selectedResource =
          (resourceParam as Resource) ?? selectedResource ?? Resource.node;
      }
      if (!resourceParam && $view.isConstrainedWidth) {
        selectedResource = Resource.unknown;
      }
    });
    return () => {
      pageSub();
    };
  });
</script>

<div class="flex flex-col gap-4 w-full">
  {#key selectedResource}
    <LibraryRecordsPane
      resource={selectedResource}
      bind:this={recordsPaneRef}
    />
  {/key}
</div>
