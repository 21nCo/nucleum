<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import Records from "@nucleum/surfaces/library/records/Records.svelte";
  import { onMount, untrack } from "svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { ButtonStyle } from "@21n/ui/elements/button/button.type";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import ResourceSwitcher from "@nucleum/surfaces/library/resourceSwitcher/ResourceSwitcher.svelte";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import {
    resourceAction,
    availableResources,
    resolveResourceIcon
  } from "@nucleum/datafn/resource.utils";
  import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
  import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
  import { recentsStore } from "@nucleum/shared-state/resources/recent.store";
  import { page } from "$app/stores";
  import view from "@21n/ui/environment/view.store";
  import InlineSyncingFeedback from "@nucleum/shell/sync/InlineSyncingFeedback.svelte";
  import Panel from "@nucleum/shell/paint/Panel.svelte";
  import Text from "@21n/ui/elements/text/Text.svelte";
  import { TextStyle } from "@21n/ui/elements/text/text.enum";
  import LibraryRecordsPane from "@nucleum/surfaces/library/LibraryRecordsPane.svelte";
  import ScrollViewBottomSpacer from "@21n/ui/compositions/scrollView/ScrollViewBottomSpacer.svelte";
  import LibraryLoadingPulse from "@nucleum/surfaces/library/LibraryLoadingPulse.svelte";
  import { Arrangement, Placement } from "@21n/ui/elements/direction.enum";
  import EmptyStatusView from "@21n/ui/elements/feedback/EmptyStatusView.svelte";
  import { Action } from "@nucleum/client/config/action.enum";
  import ContextMenu from "@21n/ui/elements/contextMenu/ContextMenu.svelte";
  import ResourceBrowser from "@nucleum/surfaces/library/resourceBrowser/ResourceBrowser.svelte";
  import { Product } from "@nucleum/client/config/product.type";
  import { isHideCreateAction } from "@nucleum/shared-state/resources/library.utils";
  import ComponentShortcutListener from "@21n/ui/compositions/keyboard/ComponentShortcutListener.svelte";
  import { keyboardShortcuts } from "@nucleum/shared-state/shortcuts/shortcuts.store";
  import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
  import {
    LIBRARY_DEFAULT_SUBTYPE,
    parseLibraryPath,
    parseLibraryResource,
    parseLibrarySubType,
    isLibraryPathRouted,
    replaceLibraryPath,
    resolveLibraryFallbackSubType
  } from "@nucleum/surfaces/library/library-route";

  let {
    resources = [],
    subPath = undefined,
    isRouted = undefined
  }: {
    resources?: Resource[];
    subPath?: string[];
    isRouted?: boolean;
  } = $props();

  const routed = $derived(
    isRouted ??
      isLibraryPathRouted(
        $appStore.actions,
        $appStore.currentComponent,
        $page.url.pathname
      )
  );
  let selectedResource = $state<Resource>(Resource.unknown);
  let localSubPath = $state<string[] | undefined>(untrack(() => subPath));
  const subType = $derived(
    selectedResource === Resource.unknown
      ? undefined
      : ((routed
          ? parseLibraryPath($page.url.pathname).subType
          : parseLibrarySubType(selectedResource, localSubPath?.[1])) ??
          resolveLibraryFallbackSubType(selectedResource))
  );

  function selectView(
    resource?: Resource,
    nextSubType?: string,
    options?: { isResetFilters?: boolean }
  ) {
    if (routed) {
      replaceLibraryPath(resource, nextSubType, options);
      return;
    }
    localSubPath = resource
      ? [resource, nextSubType ?? LIBRARY_DEFAULT_SUBTYPE]
      : undefined;
  }

  function selectSubType(nextSubType: string) {
    selectView(selectedResource, nextSubType);
  }
  let syncFeedbackRef = $state<InlineSyncingFeedback>();

  function syncSelectedResource(pathResource?: Resource) {
    if (pathResource) {
      selectedResource = pathResource;
      return;
    }
    if ($view.isConstrainedWidth) {
      selectedResource = Resource.unknown;
      return;
    }
    if (selectedResource === Resource.unknown) {
      selectedResource = resources[0] ?? Resource.unknown;
    }
  }
  let floatingButton = $derived(
    $view.isConstrainedWidth && selectedResource === Resource.unknown
      ? [
          {
            label: "Search",
            callback: async () => {
              requireCommandHost().runAction(Action.SEARCH);
            },
            icon: "search"
          },
          {
            label: "Create",
            popoverAction: {
              content: ContextMenu,
              placement: Placement.TopCenter,
              isRenderAsModalForCW: true,
              componentProps: {
                parentBgIndex: 0,
                isFullWidth: $view.isConstrainedWidth,
                menuResolver: resolveCreateResourceMenu,
                size: Size.lg
              }
            },
            icon: "plus-circle"
          }
        ]
      : !availableResources.has(selectedResource) ||
          isHideCreateAction(selectedResource)
        ? undefined
        : {
            label: "New " + selectedResource,
            callback: async () => {
              onCreateResource();
            },
            icon: "plus",
            parentBgIndex: 2,
            shortcut: Action.CREATE,
            style: ButtonStyle.OUTLINED
          }
  );

  $effect(() => {
    if (!$view.isConstrainedWidth && selectedResource === Resource.unknown) {
      selectedResource = resources[0] ?? Resource.unknown;
    }
  });

  $effect.pre(() => {
    const next = subPath;
    if (routed) return;
    untrack(() => {
      localSubPath = next;
      syncSelectedResource(parseLibraryResource(next?.[0]));
    });
  });

  $effect(() => {
    if (!routed || !subPath) return;
    const segments = subPath;
    untrack(() => canonicalizeRoutedPath(segments));
  });

  function canonicalizeRoutedPath(segments: string[]) {
    const pathResource = parseLibraryResource(segments[0]);
    const resource =
      pathResource ??
      ($view.isConstrainedWidth
        ? undefined
        : selectedResource !== Resource.unknown
          ? selectedResource
          : resources[0]);
    const viewSubType = resource
      ? ((pathResource && parseLibrarySubType(resource, segments[1])) ??
        resolveLibraryFallbackSubType(resource))
      : undefined;
    const canonical = resource ? [resource, viewSubType] : [];
    if (segments.join("/") === canonical.join("/")) return;
    replaceLibraryPath(resource, viewSubType);
  }

  onMount(() => {
    const syncFromWindow = () => {
      if (!routed) return;
      syncSelectedResource(parseLibraryPath(window.location.pathname).resource);
    };
    const pageSub = page.subscribe(async (p) => {
      if (!routed) return;
      syncSelectedResource(parseLibraryPath(p.url.pathname).resource);
    });
    window.addEventListener(GlobalEvent.CUSTOM_NAVIGATION, syncFromWindow);
    window.addEventListener("popstate", syncFromWindow);
    syncFromWindow();
    return () => {
      pageSub();
      window.removeEventListener(GlobalEvent.CUSTOM_NAVIGATION, syncFromWindow);
      window.removeEventListener("popstate", syncFromWindow);
    };
  });

  function onCreateResource(resource?: Resource) {
    requireCommandHost().runAction(
      resourceAction(resource ?? selectedResource, ResourceActionType.CREATE)
    );
  }

  function resolveCreateResourceMenu() {
    let resources: Resource[] = [];
    switch ($appStore.product) {
      case Product.POINTRON:
        resources = [
          Resource.task,
          Resource.objective,
          Resource.event,
          Resource.collection
        ];
        break;
      case Product.MEMOTRON:
        resources = [Resource.node, Resource.collection];
        break;
      case Product.NUCLEUM:
        resources = [
          Resource.node,
          Resource.task,
          Resource.objective,
          Resource.event,
          Resource.collection
        ];
        break;
      default:
        resources = [Resource.collection];
    }

    const items = resources.map((resource) => {
      return {
        label: "New " + resource,
        value: resource,
        icon: resolveResourceIcon(resource),
        callback: async () => {
          onCreateResource(resource);
        }
      };
    });
    return [
      {
        group: "all",
        isToggleGroup: $view.isConstrainedWidth,
        items
      }
    ];
  }
</script>

<Panel
  title="Library"
  {floatingButton}
  panelSize={Size.sm}
  isNavActivated={selectedResource !== Resource.unknown &&
    $view.isConstrainedWidth}
  isHideRightSplit={!$view.isPortrait}
>
  {#if $view.isConstrainedWidth}
    <InlineSyncingFeedback
      bind:this={syncFeedbackRef}
      resource={selectedResource}
    />
  {/if}
  <div class="flex mo:py-3 py-5 w-full h-fit shrink-0">
    <ResourceSwitcher
      {resources}
      selected={selectedResource}
      isShowCount={true}
      onSelect={(selectedValue) => {
        selectedResource = selectedValue;
        selectView(selectedValue, LIBRARY_DEFAULT_SUBTYPE, {
          isResetFilters: true
        });
        syncFeedbackRef?.refresh(selectedValue);
      }}
    />
  </div>
  {#if $view.isConstrainedWidth}
    <div class="flex flex-col gap-2 w-full flex-grow">
      <Text content="Recents" style={TextStyle.SECTION_HEADING} />
      <div class="flex flex-col gap-4 w-full flex-grow">
        {#if !$recentsStore.isInitialized}
          <LibraryLoadingPulse
            arrangement={Arrangement.LIST}
            isConstrainedWidth={true}
          />
        {:else if $recentsStore.recents && $recentsStore.recents.length > 0}
          {@const recentsData = $recentsStore.recents
            .filter((x) => x && x.timestamp)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .map((x) => x.record)}
          <Records
            data={recentsData}
            accessPoint={ResourceAccessPoint.LIBRARY}
            resource={selectedResource}
            size={Size.sm}
          />
          <ScrollViewBottomSpacer />
        {:else}
          <EmptyStatusView
            size={Size.sm}
            isSearchContext={true}
            mainText="No recents found"
          />
        {/if}
      </div>
    </div>
  {/if}
  {#snippet nav()}
    {#if selectedResource !== Resource.unknown}
      <div class="flex flex-grow">
        <ResourceBrowser
          resource={selectedResource}
          {subType}
          onSubTypeChange={selectSubType}
          isPreventCwPadding={true}
          onBack={() => {
            selectedResource = Resource.unknown;
            selectView();
          }}
        />
      </div>
    {/if}
  {/snippet}
  {#snippet right()}
    {#if selectedResource !== Resource.unknown}
      <div class="flex flex-col gap-4 w-full">
        {#key selectedResource}
          <LibraryRecordsPane
            resource={selectedResource}
            {subType}
            onSubTypeChange={selectSubType}
          />
        {/key}
      </div>
    {/if}
  {/snippet}
</Panel>

{#if selectedResource !== Resource.task}
  <ComponentShortcutListener
    checkShortcut={keyboardShortcuts.checkShortcut.bind(keyboardShortcuts)}
    shortcuts={[
      {
        shortcut: Action.CREATE,
        callback: onCreateResource
      }
    ]}
  />
{/if}
