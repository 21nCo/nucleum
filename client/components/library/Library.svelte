<script lang="ts">
  import Records from "@21n/components/record/Records.svelte";
  import { onMount } from "svelte";
  import { Size } from "@21n/types/size.enum";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import ResourceSwitcher from "@21n/components/library/resourceSwitcher/ResourceSwitcher.svelte";
  import { appStore } from "@21n/stores/app.store";
  import {
    resourceAction,
    availableResources,
    resolveResourceIcon
  } from "@21n/components/flux/resourceStores/resource.utils";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "@21n/components/flux/resourceStores/resource.type";
  import { recentsStore } from "@21n/components/record/recent.store";
  import { page } from "$app/stores";
  import view from "@21n/stores/view.store";
  import InlineSyncingFeedback from "@21n/elements/feedback/InlineSyncingFeedback.svelte";
  import Panel from "@21n/layout/paint/Panel.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import { TextStyle } from "@21n/types/text.enum";
  import LibraryRecordsPane from "@21n/components/library/LibraryRecordsPane.svelte";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import LibraryLoadingPulse from "@21n/components/library/LibraryLoadingPulse.svelte";
  import { Arrangement, Placement } from "@21n/types/direction.enum";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { Action } from "@21n/types/action.enum";
  import ContextMenu from "@21n/elements/contextMenu/ContextMenu.svelte";
  import ResourceBrowser from "@21n/components/library/resourceBrowser/ResourceBrowser.svelte";
  import { Product } from "@21n/products/product.type";
  import { isHideCreateAction } from "@21n/components/library/library.utils";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import ComponentShortcutListener from "@21n/components/shortcuts/ComponentShortcutListener.svelte";

  export let resources: Resource[] = [];

  let selectedResource: Resource = $view.isConstrainedWidth
    ? Resource.unknown
    : resources[0];
  let syncFeedbackRef: InlineSyncingFeedback;
  let recordsPaneRef: LibraryRecordsPane;

  $: floatingButton =
    $view.isConstrainedWidth && selectedResource === Resource.unknown
      ? [
          {
            label: "Search",
            callback: async () => {
              appStore.runAction(Action.SEARCH);
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
          };

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
        resources = [Resource.node, Resource.collection];
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
      on:select={(e) => {
        appStore.toggleSearchParam({
          [AppSearchParam.RESOURCE]: e.detail,
          [AppSearchParam.TYPE]: "all",
          [AppSearchParam.STARRED]: null,
          [AppSearchParam.ARCHIVED]: null
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
  <div slot="nav" class="flex flex-grow">
    <ResourceBrowser
      resource={selectedResource}
      isPreventCwPadding={true}
      onBack={() => {
        selectedResource = Resource.unknown;
        appStore.toggleSearchParam([AppSearchParam.RESOURCE]);
      }}
    />
  </div>
  <div slot="right" class="flex flex-col gap-4 w-full">
    {#key selectedResource}
      <LibraryRecordsPane
        resource={selectedResource}
        bind:this={recordsPaneRef}
      />
    {/key}
  </div>
</Panel>

{#if selectedResource !== Resource.task}
  <ComponentShortcutListener
    shortcuts={[
      {
        shortcut: Action.CREATE,
        callback: onCreateResource
      }
    ]}
  />
{/if}
