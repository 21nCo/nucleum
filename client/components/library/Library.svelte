<script lang="ts">
  import Records from "$lib/client/components/record/Records.svelte";
  import { onMount } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import ResourceSwitcher from "./resourceSwitcher/ResourceSwitcher.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import {
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
  import ResourceBrowser from "./resourceBrowser/ResourceBrowser.svelte";
  import { Product } from "$lib/client/products/product.type";
  import { isHideCreateAction } from "./library.utils";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  import ComponentShortcutListener from "../shortcuts/ComponentShortcutListener.svelte";
  import { keyboardShortcuts } from "../shortcuts/shortcuts.store";

  export let resources: Resource[] = [];

  let selectedResource: Resource = $view.isConstrainedWidth
    ? Resource.unknown
    : resources[0];
  let syncFeedbackRef: InlineSyncingFeedback;
  let recordsPaneRef: LibraryRecordsPane;
  const createShortcut = keyboardShortcuts?.resolveShortcutForAction("create");

  $: floatingButton =
    $view.isConstrainedWidth && selectedResource === Resource.unknown
      ? [
          {
            label: "Search",
            callback: async () => {
              appStore.runAction(Action.GLOBAL_SEARCH);
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
            variant: ButtonVariant.PRIMARY,
            shortcut: createShortcut,
            style: ButtonStyle.DEFAULT
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
      onBack={() => {
        selectedResource = Resource.unknown;
        appStore.toggleSearchParam([AppSearchParam.RESOURCE]);
      }}
    />
  </div>
</Panel>

{#if createShortcut}
  <ComponentShortcutListener
    shortcuts={[
      {
        shortcut: createShortcut,
        callback: onCreateResource
      }
    ]}
  />
{/if}
