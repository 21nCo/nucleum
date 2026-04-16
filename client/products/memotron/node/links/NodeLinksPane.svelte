<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import LinkThumbnailItems from "@21n/products/memotron/node/links/LinkThumbnailItems.svelte";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import { Size } from "@21n/types/size.enum";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import ErrorStatusPane from "@21n/elements/feedback/ErrorStatusPane.svelte";
  import {
    AccessMode,
    ResourceAccessPoint
  } from "@21n/components/flux/resourceStores/resource.type";
  import InlineTimeoutMessage from "@21n/elements/text/InlineTimeoutMessage.svelte";
  import { AlertType } from "@21n/types/notification.type";
  import {
    nodeStore,
    type IActiveNodeStore
  } from "@21n/products/memotron/node/node.store";
  import {
    type INode,
    type INodeLinkThumb
  } from "@21n/products/memotron/node/node.type";
  import { LinkType } from "@21n/products/memotron/linking/link.type";
  import { linker } from "@21n/products/memotron/linking/link.store";
  import LinkSearch from "@21n/products/memotron/common/linkbox/LinkSearch.svelte";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { flux } from "@21n/components/flux/flux";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { logger } from "@21n/components/debug/logger.client";
  import type { IRecordId } from "@21n/types/data.type";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  import LinkTagFilter from "@21n/products/memotron/node/links/LinkTagFilter.svelte";
  import ComingSoonView from "@21n/elements/ComingSoonView.svelte";
  import {
    resourceInList,
    isSameResource
  } from "@21n/components/flux/resourceStores/resource.utils";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "@21n/types/switcher.enum";
  import { activeResourceFilterV2 } from "@21n/utils/utils";
  import { BulkEditor } from "@21n/components/record/record.store";
  import { bulkEditStore } from "@21n/components/record/bulkedit.store";
  import { toasts } from "@21n/stores/notification.store";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import {
    ErrorMessage,
    ResourceErrorCode
  } from "@21n/components/error/error.type";
  import { ResourceError } from "@21n/components/error/errors";
  import { LoadingAnimationType } from "@21n/types/feedback.type";
  import Tag from "@21n/elements/text/Tag.svelte";
  import { resolveLinkTypeConfig } from "@21n/products/memotron/linking/link.utils";
  let { node }: { node: IActiveNodeStore } = $props();
  let multiSelectContext = $derived({
    resource: Resource.node,
    accessPoint: ResourceAccessPoint.NODE_LINKS,
    accessPointId: node.id
  });
  let bulkEditUnsub: (() => void) | undefined;
  let bulkSelection: IRecordId[] = [];

  function resolveBulkEditorInstance() {
    bulkEditStore.activate(multiSelectContext, {
      onAction: handleBulkAction,
      onSelectAll: selectAll,
      subContext: node.id.toString()
    });
    if (!bulkEditUnsub) {
      bulkEditUnsub = bulkEditStore.subscribe((value = []) => {
        bulkSelection = value;
      });
    }
  }

  function selectAll() {
    return filtered?.map((x) => x.node.id.toString()) ?? [];
  }

  async function handleBulkAction(
    ids: IRecordId[],
    action: string,
    data?: unknown
  ) {
    try {
      const editor = new BulkEditor(Resource.node, bulkEditStore);
      const result = await editor.run(action, data);
      if (result) {
        if (action === "unlink") {
          $node.links = $node.links?.filter(
            (x) => !ids.some(resourceInList(x.linkedTo))
          );
        }
        await refresh();
      }
    } catch (e) {
      toasts.error("Failed to perform bulk action");
    }
  }

  $effect(() => {
    multiSelectContext;
    filtered;
    resolveBulkEditorInstance();
  });
  let _links: INodeLinkThumb[] = [];
  let all: { link: INodeLinkThumb; node: INode }[] = [];
  let outgoingMentions: { link: INodeLinkThumb; node: INode }[] = [];
  let filtered: { link: INodeLinkThumb; node: INode }[] = [];

  let selectedLinkType:
    | { linkType: LinkType; direction?: "incoming" | "outgoing" }
    | undefined = undefined;
  let selectedLinkTags: IRecordId[] = [];
  let fetchError: string | undefined = undefined;
  let linkStatus: { message: string; type: AlertType } = {
    message: "",
    type: AlertType.INFO
  };
  let previousFocus: IRecordId;
  let searchQuery: string = "";
  let dev_linkTagFilter: "and" | "or" = "and";
  let isRefreshing = false;
  let availableLinkTags: IRecordId[] = [];

  onMount(() => {
    const unsubscribe = node.subscribe(async (x) => {
      if (!x.links) return;
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

  onDestroy(() => {
    bulkEditUnsub?.();
    if (bulkEditStore.matchesContext(multiSelectContext)) {
      bulkEditStore.clear();
    }
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
        links: [
          {
            linkType: LinkType.DIRECT,
            id: result[0]?.id ?? ""
          }
        ]
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
      logger.error({ at: "NodeLinksPane.onSelect", error: e });
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
    isRefreshing = true;
    const result = await nodeStore.selectMany(
      {
        filters: {
          id: _links.map((x) => x.linkedTo.toString())
        }
      },
      {
        isExpand: true
      }
    );
    if (!result || result.length == 0) {
      all = [];
      isRefreshing = false;
      return;
    }
    all = result.map((x: INode) => ({
      link: _links.find((y) => y.linkedTo.toString() == x.id.toString()),
      node: x
    }));
    applyFilters();
    isRefreshing = false;
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
      const nodes = await nodeStore.selectMany(
        {
          filters: {
            id: result.map((x: any) => x.out.toString())
          }
        },
        {
          isExpand: true
        }
      );
      if (!isValidArrayWithData(nodes)) return [];
      outgoingMentions = result.map((x: any) => ({
        link: {
          linkedTo: x.out,
          links: [
            {
              linkType: LinkType.MENTION,
              id: x.id,
              direction: "outgoing"
            }
          ],
          tags: x.tags
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
    const outgoing = await refreshOutgoingMentions();
    const combined = [...all, ...outgoing].filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          (t) => t.link.linkedTo.toString() === item.link.linkedTo.toString()
        )
    );

    filtered = combined;

    const allTags = new Set<IRecordId>();
    combined.forEach((item) => {
      item.link.tags?.forEach((tag) => {
        allTags.add(tag);
      });
    });
    availableLinkTags = Array.from(allTags);

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
    const currentSelectedLinkType = selectedLinkType;
    if (currentSelectedLinkType) {
      filtered = filtered.filter((x) =>
        x.link.links?.some(
          (y) =>
            y.linkType === currentSelectedLinkType.linkType &&
            (!currentSelectedLinkType.direction ||
              y.direction === currentSelectedLinkType.direction)
        )
      );
    }
  }

  /**
   * TODO - click handler - check for new bulk edit store changes
   * @param e
   */
  function onClick(e: CustomEvent) {
    resolveBulkEditorInstance();
    const result = bulkEditStore.clickHandler(e.detail.id);
    if (!result) {
      appStore.resourceClickHandler(e.detail.event, e.detail.id, {
        origin: $node.id
      });
    }
  }

  function onAction(e: CustomEvent) {
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
    applyFilters();
  }

  function onLinkTypeSelect(e: CustomEvent) {
    if (!e.detail) return;
    selectedLinkType = e.detail;
    applyFilters();
  }
</script>

<div class="relative flex flex-col gap-3 pt-1 flex-grow w-full">
  <div class="flex flex-col w-full">
    <LinkSearch
      accessPoint={ResourceAccessPoint.NODE_LINKS}
      onSelect={onSelect}
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
    {#if selectedLinkType}
      {@const config = resolveLinkTypeConfig(
        selectedLinkType.linkType,
        selectedLinkType.direction
      )}
      <div>
        <Tag
          label={config.label}
          icon={config.icon}
          size={Size.md}
          isActive={true}
          isRemovable={true}
          onRemove={() => {
            selectedLinkType = undefined;
            applyFilters();
          }}
          onclick={() => {
            selectedLinkType = undefined;
            applyFilters();
          }}
        />
      </div>
    {/if}
    {#if availableLinkTags.length > 0}
      <div class="flex flex-col gap-3">
        <LinkTagFilter
          links={filtered.map((x) => x.link)}
          bind:selected={selectedLinkTags}
          onChange={applyFilters}
        />
      </div>
    {/if}
    {#if fetchError}
      <ErrorStatusPane error={fetchError} />
    {:else if filtered.length > 0 && !isRefreshing}
      <div class="flex flex-col flex-grow w-full">
        <LinkThumbnailItems
          links={filtered}
          accessPointId={node.id}
          onClick={onClick}
          onAction={onAction}
          onTagClick={onTagClick}
          onTag={() => {
            applyFilters();
          }}
          onLinkTypeSelect={onLinkTypeSelect}
        />
        <ScrollViewBottomSpacer />
      </div>
    {:else}
      <EmptyStatusView
        isSearchContext={true}
        isLoadingState={isRefreshing}
        loadingAnimation={LoadingAnimationType.FOCUS_ITEMS_PULSE}
        mainText="No links found."
        subText="Try different filters or add links."
      />
    {/if}
  </div>
</div>
