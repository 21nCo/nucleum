<script lang="ts">
  import { untrack } from "svelte";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import view from "@21n/ui/environment/view.store";
  import LibraryRecordsPane from "@nucleum/surfaces/library/LibraryRecordsPane.svelte";
  import {
    parseLibraryResource,
    parseLibrarySubType,
    replaceLibraryPath,
    resolveLibraryFallbackSubType
  } from "@nucleum/surfaces/library/library-route";

  let {
    defaultResource = Resource.node,
    subPath = undefined,
    isRouted = false
  }: {
    defaultResource?: Resource;
    subPath?: string[];
    isRouted?: boolean;
  } = $props();

  let recordsPaneRef = $state<LibraryRecordsPane | undefined>();
  let localSubPath = $state<string[] | undefined>(untrack(() => subPath));

  $effect.pre(() => {
    localSubPath = subPath;
  });

  const viewPath = $derived(isRouted ? subPath : localSubPath);
  const pathResource = $derived(parseLibraryResource(viewPath?.[0]));
  const selectedResource = $derived(
    pathResource ??
      ($view.isConstrainedWidth ? Resource.unknown : defaultResource)
  );
  const selectedSubType = $derived(
    selectedResource === Resource.unknown
      ? undefined
      : (parseLibrarySubType(selectedResource, viewPath?.[1]) ??
          resolveLibraryFallbackSubType(selectedResource))
  );

  function selectSubType(subType: string) {
    if (isRouted) replaceLibraryPath(selectedResource, subType);
    else localSubPath = [selectedResource, subType];
  }

  $effect(() => {
    if (!isRouted || !subPath || selectedResource === Resource.unknown) return;
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
        onSubTypeChange={selectSubType}
        bind:this={recordsPaneRef}
      />
    {/key}
  {/if}
</div>
