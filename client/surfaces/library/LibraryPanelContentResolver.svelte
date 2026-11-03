<script lang="ts">
  import { untrack } from "svelte";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import view from "@21n/ui/environment/view.store";
  import LibraryRecordsPane from "@nucleum/surfaces/library/LibraryRecordsPane.svelte";
  import {
    LIBRARY_DEFAULT_SUBTYPE,
    parseLibraryResource,
    parseLibrarySubType,
    replaceLibraryPath
  } from "@nucleum/surfaces/library/library-route";

  let {
    defaultResource = Resource.node,
    subPath = undefined
  }: { defaultResource?: Resource; subPath?: string[] } = $props();

  let recordsPaneRef = $state<LibraryRecordsPane | undefined>();

  const pathResource = $derived(parseLibraryResource(subPath?.[0]));
  const selectedResource = $derived(
    pathResource ??
      ($view.isConstrainedWidth ? Resource.unknown : defaultResource)
  );
  const selectedSubType = $derived(
    selectedResource === Resource.unknown
      ? LIBRARY_DEFAULT_SUBTYPE
      : (parseLibrarySubType(selectedResource, subPath?.[1]) ??
          LIBRARY_DEFAULT_SUBTYPE)
  );

  $effect(() => {
    if (!subPath || selectedResource === Resource.unknown) return;
    if (subPath.join("/") === `${selectedResource}/${selectedSubType}`) return;
    const resource = selectedResource;
    const subType = selectedSubType;
    untrack(() => replaceLibraryPath(resource, subType));
  });
</script>

<div class="flex flex-col gap-4 w-full">
  {#if selectedResource !== Resource.unknown}
    {#key selectedResource}
      <LibraryRecordsPane
        resource={selectedResource}
        subType={selectedSubType}
        onSubTypeChange={(subType) =>
          replaceLibraryPath(selectedResource, subType)}
        bind:this={recordsPaneRef}
      />
    {/key}
  {/if}
</div>
