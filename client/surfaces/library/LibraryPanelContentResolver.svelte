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
  import { resolveLibrarySwitcherSections } from "@nucleum/surfaces/library/resource-switcher.utils";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import BoxSwitcher from "@21n/ui/elements/switcher/BoxSwitcher.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import ContextZoneContent from "@nucleum/shell/topNav/contextZone/ContextZoneContent.svelte";
  import {
    contextZone,
    type ContextZoneViews
  } from "@nucleum/shell/topNav/contextZone/context-zone";
  import {
    isLibrarySwitcherInTopBar,
    libraryTopBarTabs
  } from "@nucleum/surfaces/library/library-switcher-placement";

  let {
    defaultResource = Resource.node,
    resources = [],
    subPath = undefined,
    isRouted = false
  }: {
    defaultResource?: Resource;
    /** Resource types the product library lists. */
    resources?: Resource[];
    subPath?: string[];
    isRouted?: boolean;
  } = $props();

  const contextZoneOptions = $derived(
    resolveLibrarySwitcherSections(
      $appStore.product,
      resources,
      import.meta.env.DEV
    )
      .flatMap((section) => section.items)
      .filter((item) => !item.isDisabled)
  );

  const isContextZoneHosted = contextZone.isHosted;
  const isSwitcherInTopBar = $derived(
    isLibrarySwitcherInTopBar($appStore.product, resources.length, {
      isContextZoneHosted: $isContextZoneHosted,
      isConstrainedWidth: $view.isConstrainedWidth
    })
  );

  $effect(() => {
    if (!isSwitcherInTopBar) return;
    return libraryTopBarTabs.host();
  });

  function selectResource(resource: Resource) {
    const subType = resolveLibraryFallbackSubType(resource);
    if (isRouted) replaceLibraryPath(resource, subType, { isResetFilters: true });
    else localSubPath = [resource, subType];
  }

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
  const resourceViews = $derived<ContextZoneViews>({
    values: contextZoneOptions.map((item) => String(item.value)),
    active: selectedResource,
    select: (value) => selectResource(value as Resource)
  });
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
    if (!isRouted || !subPath) return;
    const resource =
      selectedResource === Resource.unknown ? undefined : selectedResource;
    const subType = selectedSubType;
    const canonical = resource ? [resource, subType] : [];
    if (subPath.join("/") === canonical.join("/")) return;
    untrack(() => replaceLibraryPath(resource, subType));
  });
</script>

{#if isSwitcherInTopBar}
  <ContextZoneContent isInlineFallback={false} views={resourceViews}>
    <div class="h-full" data-testid="library-resource-tabs">
      <BoxSwitcher
        isTablist={true}
        options={contextZoneOptions}
        selected={selectedResource}
        size={Size.md}
        onSelect={(event) => selectResource(event.detail as Resource)}
      />
    </div>
  </ContextZoneContent>
{/if}
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
