<script lang="ts">
  import { onMount } from "svelte";
  import LinkThumbnailItems from "./LinkThumbnailItems.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import ErrorStatusPane from "$lib/client/elements/feedback/ErrorStatusPane.svelte";
  import { resolveMultiSelectStore } from "$lib/client/components/flux/resourceStores/resource.store";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import BottomFloat from "$lib/client/elements/BottomFloat.svelte";
  import BulkEditBar from "../../../../components/record/BulkEditBar.svelte";
  import InlineTimeoutMessage from "$lib/client/elements/text/InlineTimeoutMessage.svelte";
  import { AlertType } from "$lib/client/types/notification.type";
  import {
    nodeStore,
    type IActiveNodeStore
  } from "$lib/client/products/memotron/node/node.store";
  import {
    type INode,
    type INodeLinkThumb,
    LinkType
  } from "$lib/client/products/memotron/node/node.type";
  import { linker } from "$lib/client/products/memotron/linking/link.store";
  import LinkSearch from "$lib/client/products/memotron/common/linkbox/LinkSearch.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { flux } from "$lib/client/components/flux/flux";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { logger } from "$lib/client/components/debug/logger.client";
  import type { IRecordId } from "$lib/client/types/data.type";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import LinkTagFilter from "./LinkTagFilter.svelte";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import {
    resourceInList,
    isSameResource
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { activeResourceFilterV2 } from "$lib/client/utils/utils";
  import { BulkEditor } from "../../../../components/record/record.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import { deepCopy, isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import {
    ErrorMessage,
    ResourceErrorCode
  } from "$lib/client/components/error/error.type";
  import { ResourceError } from "$lib/client/components/error/errors";
  export let node: IActiveNodeStore;
  $: multiSelectContext = {
    resource: Resource.node,
    accessPoint: ResourceAccessPoint.NODE_LINKS,
    accessPointId: node.id
  };
  $: multiSelectStore = resolveMultiSelectStore(multiSelectContext);
  let _links: INodeLinkThumb[] = [];
  let all: { link: INodeLinkThumb; node: INode }[] = [];
  let outgoingMentions: { link: INodeLinkThumb; node: INode }[] = [];
  let filtered: { link: INodeLinkThumb; node: INode }[] = [];

  let selectedLinkType: LinkType = LinkType.DIRECT;
  let selectedLinkTags: IRecordId[] = [];
  let fetchError: string | undefined = undefined;
  let linkStatus: { message: string; type: AlertType } = {
    message: "",
    type: AlertType.INFO
  };
  let previousFocus: IRecordId;
  let searchQuery: string = "";
  let isShowLinkTagFilters = false;
  let isShowLinkSuggestions = false;
  let dev_linkTagFilter: "and" | "or" = "and";
  let selectedMentionDirection: "incoming" | "outgoing" = "incoming";

  onMount(async () => {
    await refresh();
    const unsubscribe = node.subscribe(async (x) => {
      let currentFocus = previousFocus;
      if (!x.focusedBlock) currentFocus = x.id;
      else currentFocus = x.focusedBlock;
      if (
        !previousFocus ||
        (previousFocus && !isSameResource(previousFocus, currentFocus))
      ) {
        await refresh();
        previousFocus = currentFocus;
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });

  async function onSelect(e: CustomEvent<any>) {
    try {
      linkStatus = {
        message: "Linking...",
        type: AlertType.INFO
      };
      if (!e.detail?.item?.id) {
        linkStatus.message = ErrorMessage.DEFAULT;
        linkStatus.type = AlertType.ERROR;
        return;
      }
      if (filtered.some((x) => isSameResource(x.node, e.detail.item))) {
        linkStatus.message = "Link already exists.";
        linkStatus.type = AlertType.ERROR;
        return;
      }
      const result = await linker.link(
        $node.focusedBlock ?? node.id,
        e.detail.item.id
      );

      const addedLink = await flux.select(e.detail.item.id);
      if (!result || !addedLink) {
        linkStatus.message = ErrorMessage.DEFAULT;
        linkStatus.type = AlertType.ERROR;
        return;
      }
      linkStatus.message = "Link added successfully.";
      linkStatus.type = AlertType.SUCCESS;
      const link: INodeLinkThumb = {
        linkedTo: e.detail.item.id,
        linkType: LinkType.DIRECT,
        id: result[0]?.id ?? ""
      };
      _links = [...(_links ?? []), link];
      $node.links = [...($node.links ?? []), link];
      all = [
        ...(all ?? []),
        {
          node: addedLink,
          link
        }
      ];
      filtered = [
        ...(filtered ?? []),
        {
          node: addedLink,
          link
        }
      ];
      searchQuery = "";
    } catch (e) {
      logger.error(e);
      if (e instanceof ResourceError) {
        if (e.code === ResourceErrorCode.ALREADY_EXISTS) {
          toasts.error("Link already exists");
        } else {
          toasts.error();
        }
      } else {
        toasts.error();
      }
    }
  }

  async function refresh() {
    if (!$node.links) {
      _links = [];
      filtered = [];
      fetchError = "Error fetching links.";
      return;
    }
    _links = $node.links;
    const result = await nodeStore.selectMany({
      filters: {
        id: _links.map((x) => x.linkedTo.toString()),
        ...activeResourceFilterV2
      }
    });
    if (!result || result.length == 0) {
      all = [];
      return;
    }
    all = result.map((x: INode) => ({
      link: _links.find((y) => y.linkedTo.toString() == x.id.toString()),
      node: x
    }));
    applyFilters();
  }

  async function refreshOutgoingMentions() {
    try {
      const result = await linker.selectMany({
        filters: {
          linkType: LinkType.MENTION,
          location: $node.blocks?.map((x) => x.id.toString()) ?? []
        }
      });
      if (!isValidArrayWithData(result)) return [];
      const nodes = await nodeStore.selectMany({
        filters: {
          id: result.map((x: any) => x.out.toString())
        }
      });
      if (!isValidArrayWithData(nodes)) return [];
      outgoingMentions = result.map((x: any) => ({
        link: {
          linkedTo: x.out,
          linkType: LinkType.MENTION,
          id: x.id,
          direction: "outgoing"
        },
        node: nodes.find((y: any) => isSameResource(y.id, x.out))
      }));
      return [...outgoingMentions];
    } catch (e) {
      logger.error({ at: "refreshOutgoingMentions", error: e });
      return [];
    }
  }

  async function applyFilters() {
    if (
      selectedLinkType === LinkType.MENTION &&
      selectedMentionDirection === "outgoing"
    ) {
      filtered = await refreshOutgoingMentions();
    } else {
      filtered = all.filter((x) => x.link.linkType === selectedLinkType);
      if (selectedLinkType === LinkType.MENTION) {
        filtered = filtered.filter(
          (x) => x.link.direction === selectedMentionDirection
        );
      }
    }
    if (selectedLinkTags.length > 0) {
      if (dev_linkTagFilter === "or") {
        filtered = filtered.filter((x) =>
          x.link.tags?.some((y) => selectedLinkTags.some(resourceInList(y)))
        );
      } else {
        filtered = filtered.filter((x) =>
          selectedLinkTags.every((y) => x.link.tags?.some(resourceInList(y)))
        );
      }
    }
  }

  function onClick(e: CustomEvent) {
    const result = multiSelectStore.clickHandler(e.detail.id);
    if (!result) appStore.resourceClickHandler(e.detail.event, e.detail.id);
  }

  function onSelectAll() {
    $multiSelectStore = filtered?.map((x) => x.node.id.toString()) ?? [];
  }

  function onAction(e: CustomEvent) {
    console.log("onAction", e);
    if (e.detail.action === "unlink") {
      filtered = filtered.filter(
        (x) => !isSameResource(x.node.id, e.detail.id)
      );
      all = all.filter((x) => !isSameResource(x.node.id, e.detail.id));
      $node.links = $node.links?.filter(
        (x) => !isSameResource(x.linkedTo, e.detail.id)
      );
      _links = _links.filter((x) => !isSameResource(x.linkedTo, e.detail.id));
    }
  }

  function onTagClick(e: CustomEvent) {
    if (!e.detail) return;
    if (selectedLinkTags.some(resourceInList(e.detail))) return;
    selectedLinkTags = [...selectedLinkTags, e.detail];
    isShowLinkTagFilters = true;
    applyFilters();
  }

  async function onBulkAction(e: CustomEvent<string>) {
    try {
      logger.log({ at: "onBulkAction", e });
      const items = deepCopy($multiSelectStore);
      const editor = new BulkEditor(Resource.node, multiSelectStore);
      const result = await editor.run(e.detail);
      if (result) {
        if (e.detail === "unlink") {
          $node.links = $node.links?.filter(
            (x) => !items.some(resourceInList(x.linkedTo))
          );
        }
        await refresh();
      }
    } catch (e) {
      toasts.error("Failed to perform bulk action");
    }
  }

  // $: console.log({ all, _links, filtered, nodeLinks: $node.links });
</script>

<div class="relative flex flex-col gap-3 pt-1 flex-grow w-full">
  <div class="flex flex-col w-full">
    <LinkSearch
      context="nodelinkspane"
      on:select={onSelect}
      bind:searchQuery
      excludeFromSearch={_links.map((x) => x.linkedTo).concat(node.id)}
    />
    {#if linkStatus.message}
      <div>
        <InlineTimeoutMessage
          bind:message={linkStatus.message}
          type={linkStatus.type}
          size={Size.sm}
        />
      </div>
    {/if}
    <!-- <div class="flex gap-3 w-full">
      <MultiselectDropdown
        options={[]}
        style={InputStyle.FILLED}
        bind:selected={selectedLinkTags}
        placeholder="Link tags"
      />
    </div> -->
  </div>
  <div class="flex flex-col gap-4 w-full flex-grow">
    <div class="flex gap-4 items-center justify-between">
      <!-- <OptionSelector
        size={Size.sm}
        bind:selected={selectedLinkType}
        on:select={applyFilters}
        options={[
          {
            value: LinkType.DIRECT,
            label: "Direct",
            icon: "arrow-right-left"
          },
          {
            label: "Mentioned",
            value: LinkType.MENTION,
            icon: "at-symbol"
          }
        ]}
      /> -->
      <PanelSwitcher
        items={[
          {
            value: LinkType.DIRECT,
            label: "Direct",
            icon: "ph:arrows-left-right-light"
          },
          {
            label: "Mentions",
            value: LinkType.MENTION,
            icon: "ph:at-light"
          }
        ]}
        size={Size.sm}
        bind:value={selectedLinkType}
        on:switch={applyFilters}
        isExpandToFullWidth={true}
        style={PanelSwitcherStyle.BAR}
      >
        <slot name="right" slot="right">
          <div class="flex items-center">
            <!-- <Toggle
              icon="ph:lightbulb-light"
              tooltip="Link suggestions"
              bind:on={isShowLinkSuggestions}
            /> -->
            <Toggle
              icon="ph:tag-light"
              tooltip="Link tags"
              bind:on={isShowLinkTagFilters}
              count={selectedLinkTags.length > 0
                ? selectedLinkTags.length
                : undefined}
            />
          </div>
        </slot>
      </PanelSwitcher>
    </div>
    {#if selectedLinkType === LinkType.MENTION}
      <OptionSelector
        size={Size.sm}
        bind:selected={selectedMentionDirection}
        on:select={applyFilters}
        options={[
          {
            value: "incoming",
            label: "Incoming",
            icon: "ph:arrow-down-left"
          },
          {
            label: "Outgoing",
            value: "outgoing",
            icon: "ph:arrow-up-right"
          }
        ]}
      />
    {/if}
    {#if isShowLinkTagFilters}
      <LinkTagFilter
        links={filtered.map((x) => x.link)}
        bind:selected={selectedLinkTags}
        on:change={applyFilters}
      />
    {/if}
    {#if fetchError}
      <ErrorStatusPane error={fetchError} />
    {:else if isShowLinkSuggestions}
      <ComingSoonView mainText="Link suggestions" subText="Coming soon..." />
    {:else if filtered.length > 0}
      <div class="flex flex-col flex-grow w-full">
        <LinkThumbnailItems
          links={filtered}
          accessPointId={node.id}
          accessPointContext={selectedLinkType}
          on:click={onClick}
          on:action={onAction}
          on:tagClick={onTagClick}
        />
        <ScrollViewBottomSpacer />
      </div>
    {:else}
      <EmptyStatusView
        isSearchContext={true}
        mainText={selectedLinkType === LinkType.SUGGESTION
          ? "No suggestions found."
          : "No results found."}
        subText={selectedLinkType === LinkType.SUGGESTION
          ? "Come back later to see link suggestions"
          : "Try different filters or add links."}
      />
    {/if}
  </div>
  {#if $multiSelectStore.length > 0}
    <BottomFloat class="!mb-3" zIndex="z-30">
      <BulkEditBar
        isConstrainedWidth={true}
        context={multiSelectContext}
        subContext={selectedLinkType}
        on:selectAll={onSelectAll}
        on:action={onBulkAction}
      />
    </BottomFloat>
  {/if}
</div>
