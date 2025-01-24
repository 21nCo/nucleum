<script lang="ts">
  import Records from "$lib/client/components/record/Records.svelte";
  import { onMount } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import ResourceSwitcher from "./resourceSwitcher/ResourceSwitcher.svelte";
  import { type IResourceSwitchItem } from "$lib/client/types/select.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { recentsStore } from "$lib/client/components/record/recent.store";
  import { page } from "$app/stores";
  import view from "$lib/client/stores/view.store";
  import { logger } from "$lib/client/components/debug/logger.client";
  import SyncStatusPropagator from "$lib/client/elements/feedback/SyncStatusPropagator.svelte";
  import InlineSyncingFeedback from "$lib/client/elements/feedback/InlineSyncingFeedback.svelte";
  import Panel from "$lib/client/layout/paint/Panel.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import LibraryRecordsPane from "./LibraryRecordsPane.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import LibraryLoadingPulse from "./LibraryLoadingPulse.svelte";
  import { Arrangement, Placement } from "$lib/client/types/direction.enum";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import ResourceBrowserCw from "./resourceBrowser/ResourceBrowserCW.svelte";
  import { Action } from "$lib/client/types/action.enum";
  import ContextMenu from "$lib/client/elements/contextMenu/ContextMenu.svelte";

  export let resources: Resource[] = [];

  let selectedResource: Resource = $view.isConstrainedWidth
    ? Resource.unknown
    : Resource.node;
  let resourceSwitcherRef: ResourceSwitcher;
  let availableResources: Set<Resource> = new Set([
    Resource.node,
    Resource.collection
  ]);
  let isSyncing: boolean = false;
  let syncStatusPropagatorRef: SyncStatusPropagator;
  let recordsPaneRef: LibraryRecordsPane;

  const resourceList: IResourceSwitchItem[] = [
    {
      label: "Nodes",
      value: Resource.node,
      icon: "ph:hexagon-light"
    },
    {
      label: "Collections",
      value: Resource.collection,
      icon: "ph:brackets-round-light",
      isPinned: true
    },
    {
      label: "Tags",
      value: Resource.tag,
      icon: "ph:tag-light"
    },
    {
      label: "Combinations",
      value: Resource.combination,
      icon: "ph:bounding-box-light",
      badge: "Planned",
      isDisabled: true
    },
    {
      label: "Tasks",
      value: Resource.task,
      icon: "ph:check-circle-light",
      badge: "Planned",
      isDisabled: true
    },
    {
      label: "Events",
      value: Resource.event,
      icon: "ph:calendar-light"
    },
    {
      label: "Habits",
      value: Resource.habit,
      icon: "ph:caret-circle-up-light"
    },
    {
      label: "Sessions",
      value: Resource.session,
      icon: "ph:clock-light"
    },
    {
      label: "Things",
      value: Resource.thing,
      icon: "ph:bicycle-light"
    },
    {
      label: "Feeds",
      value: Resource.feed,
      icon: "ph:rss-light"
    },
    {
      label: "Sources",
      value: Resource.source,
      icon: "ph:globe-light"
    },
    {
      label: "Accounts",
      value: Resource.account,
      icon: "ph:bank-light"
    },
    {
      label: "Transactions",
      value: Resource.transaction,
      icon: "ph:arrows-left-right-light"
    }
  ];

  let _resources: IResourceSwitchItem[] = [];

  $: _resources = resources.map((x) => {
    const resource = resourceList.find((y) => y.value === x);
    if (!resource) return { label: x, value: x, icon: "ph:circle-light" };
    return resource;
  });

  $: floatingButton =
    $view.isConstrainedWidth && selectedResource === Resource.unknown
      ? [
          {
            label: "Search",
            callback: async () => {
              appStore.runAction(Action.GLOBAL_SEARCH);
            },
            icon: "ph:magnifying-glass-light"
          },
          {
            label: "Create",
            popoverAction: {
              content: ContextMenu,
              placement: Placement.TopCenter,
              componentProps: {
                menuResolver: resolveCreateResourceMenu
              }
            },
            icon: "ph:plus-circle-light"
          }
        ]
      : !availableResources.has(selectedResource)
        ? undefined
        : {
            label: "Create new " + selectedResource,
            callback: async () => {
              onCreateResource();
            },
            icon: "ph:plus-light",
            variant: ButtonVariant.PRIMARY,
            style: ButtonStyle.DEFAULT
          };

  onMount(() => {
    const pageSub = page.subscribe(async (p) => {
      const resourceParam = p.url.searchParams.get("resource");
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

  function onCreateResource(resource?: Resource) {
    appStore.runAction(
      resourceAction(resource ?? selectedResource, ResourceActionType.CREATE)
    );
  }

  function resolveCreateResourceMenu() {
    return [
      {
        group: "all",
        items: [
          {
            label: "New node",
            value: "node",
            icon: "ph:hexagon-light",
            callback: async () => {
              onCreateResource(Resource.node);
            }
          },
          {
            label: "New collection",
            value: "collection",
            icon: "ph:brackets-round-light",
            callback: async () => {
              onCreateResource(Resource.collection);
            }
          }
        ]
      }
    ];
  }

  async function refreshTotalRecordCounts() {
    await resourceSwitcherRef?.refresh(selectedResource);
  }
</script>

<Panel
  title="Library"
  {floatingButton}
  isNavActivated={selectedResource !== Resource.unknown &&
    $view.isConstrainedWidth}
>
  {#if $view.isConstrainedWidth}
    <InlineSyncingFeedback {isSyncing} isFullWidthVariant={true} />
  {/if}
  <div class="flex mo:py-3 py-5 w-full h-fit shrink-0">
    <ResourceSwitcher
      options={_resources}
      selected={selectedResource}
      isShowCount={true}
      bind:this={resourceSwitcherRef}
      on:select={(e) => {
        appStore.toggleSearchParam({
          resource: e.detail,
          type: "all"
        });
        syncStatusPropagatorRef?.refresh(e.detail);
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
          {@const recentsData = recentsStore.resolve()}
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
  <div slot="nav" class="flex flex-grow">
    <ResourceBrowserCw
      resource={selectedResource}
      on:back={() => {
        selectedResource = Resource.unknown;
        appStore.toggleSearchParam(["resource"]);
      }}
    />
  </div>
  <div slot="right" class="flex flex-col gap-4 w-full">
    {#key selectedResource}
      <LibraryRecordsPane
        resource={selectedResource}
        {isSyncing}
        bind:this={recordsPaneRef}
        on:refreshTotalCount={refreshTotalRecordCounts}
      />
    {/key}
  </div>
</Panel>

<SyncStatusPropagator
  bind:this={syncStatusPropagatorRef}
  resource={selectedResource}
  bind:isSyncing
/>
