<script lang="ts">
  import { onMount } from "svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { page } from "$app/stores";
  import view from "@21n/stores/view.store";
  import LibraryRecordsPane from "@21n/components/library/LibraryRecordsPane.svelte";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { isValidEnumValue } from "@21n/shared-utils/text.utils";

  export let defaultResource: Resource = Resource.node;

  let selectedResource: Resource = $view.isConstrainedWidth
    ? Resource.unknown
    : defaultResource;
  let recordsPaneRef: LibraryRecordsPane;

  onMount(() => {
    const pageSub = page.subscribe(async (p) => {
      const resourceParam = p.url.searchParams.get(AppSearchParam.RESOURCE);
      if (resourceParam && resourceParam !== selectedResource) {
        selectedResource = isValidEnumValue(resourceParam, Resource)
          ? (resourceParam as Resource)
          : (selectedResource ?? Resource.node);
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
