<script lang="ts">
  import Records from "$lib/client/components/record/Records.svelte";
  import { onMount } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import ResourceSwitcher from "./resourceSwitcher/ResourceSwitcher.svelte";
  import { type IResourceSwitchItem } from "$lib/client/types/select.type";
  import { appStore } from "$lib/client/stores/app.store";
  import {
    resolveResourceSwitcher,
    resourceAction,
    availableResources,
    resolveResourceIcon
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { recentsStore } from "$lib/client/components/record/recent.store";
  import { page } from "$app/stores";
  import view from "$lib/client/stores/view.store";
  import InlineSyncingFeedback from "$lib/client/elements/feedback/InlineSyncingFeedback.svelte";
  import Panel from "$lib/client/layout/paint/Panel.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import LibraryRecordsPane from "./LibraryRecordsPane.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import LibraryLoadingPulse from "./LibraryLoadingPulse.svelte";
  import { Arrangement, Placement } from "$lib/client/types/direction.enum";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Action } from "$lib/client/types/action.enum";
  import ContextMenu from "$lib/client/elements/contextMenu/ContextMenu.svelte";
  import ResourceBrowserV3 from "./resourceBrowser/ResourceBrowserV3.svelte";
  import { Product } from "$lib/client/types/product.type";
  import { isHideCreateAction } from "./library.utils";

  export let resources: Resource[] = [];

  let selectedResource: Resource = $view.isConstrainedWidth
    ? Resource.unknown
    : resources[0];
  let resourceSwitcherRef: ResourceSwitcher;
  let availableResourcesSet: Set<Resource> = new Set(availableResources);
  let syncFeedbackRef: InlineSyncingFeedback;
  let recordsPaneRef: LibraryRecordsPane;

  const resourceList: IResourceSwitchItem[] = resolveResourceSwitcher();

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
              isRenderAsModalForCW: true,
              componentProps: {
                isFullWidth: $view.isConstrainedWidth,
                menuResolver: resolveCreateResourceMenu,
                size: Size.lg
              }
            },
            icon: "ph:plus-circle-light"
          }
        ]
      : !availableResourcesSet.has(selectedResource) ||
          isHideCreateAction(selectedResource)
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
    let resources: Resource[] = [];
    switch ($appStore.product) {
      case Product.POINTRON:
        resources = [Resource.task, Resource.goal, Resource.collection];
        break;
      case Product.MEMOTRON:
        resources = [Resource.node, Resource.task, Resource.collection];
        break;
      case Product.NUCLEUS:
        resources = [
          Resource.node,
          Resource.task,
          Resource.goal,
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
        items
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
    <InlineSyncingFeedback
      bind:this={syncFeedbackRef}
      resource={selectedResource}
      isFullWidthVariant={true}
    />
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
        syncFeedbackRef?.refresh(e.detail);
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
  <div slot="nav" class="flex flex-grow">
    <ResourceBrowserV3
      resource={selectedResource}
      isLibraryNavContext={true}
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
        bind:this={recordsPaneRef}
        on:refreshTotalCount={refreshTotalRecordCounts}
      />
    {/key}
  </div>
</Panel>
