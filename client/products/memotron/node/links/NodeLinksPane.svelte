<script lang="ts">
  import { onMount } from "svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import LinkItems from "./LinkItems.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import ErrorStatusPane from "$lib/client/elements/feedback/ErrorStatusPane.svelte";
  import { resolveMultiSelectStore } from "$lib/client/components/resourceStores/resource.store";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/resourceStores/resource.type";
  import BottomFloat from "$lib/client/elements/BottomFloat.svelte";
  import BulkEditBar from "../../common/BulkEditBar.svelte";
  import InlineTimeoutMessage from "$lib/client/elements/text/InlineTimeoutMessage.svelte";
  import { AlertType } from "$lib/client/types/notification.type";
  import type { IActiveNodeStore } from "$lib/client/products/memotron/node/node.store";
  import {
    type INode,
    LinkType
  } from "$lib/client/products/memotron/node/node.type";
  import { linker } from "$lib/client/products/memotron/memotron.store";
  import LinkSearch from "$lib/client/products/memotron/common/linkbox/LinkSearch.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  export let node: IActiveNodeStore;
  $: multiSelectContext = $node.id + "-" + ResourceAccessPoint.NODE_LINKS;
  $: multiSelectStore = resolveMultiSelectStore(multiSelectContext);
  let links: { id: string; linkType: LinkType }[] = [];
  let filtered: INode[] = [];
  let selectedLinkType: LinkType = LinkType.DIRECT;
  let selectedLinkTags: string[] = [];
  let fetchError: string | undefined = undefined;
  let linkStatus: { message: string; type: AlertType } = {
    message: "",
    type: AlertType.INFO
  };
  let previousFocus: string;
  let searchQuery: string = "";
  onMount(async () => {
    //TODO - refresh on focus
    await refresh();
    node.subscribe(async (x) => {
      let currentFocus = previousFocus;
      if (!x.focusedBlock) currentFocus = x.id;
      else currentFocus = x.focusedBlock;
      if (previousFocus != currentFocus) {
        await refresh();
        previousFocus = currentFocus;
      }
    });
  });

  async function onSelect(e: CustomEvent<any>) {
    console.log("onselect", e.detail);
    linkStatus = {
      message: "Linking...",
      type: AlertType.INFO
    };
    if (!e.detail.item.id) {
      linkStatus.message = "Something went wrong. Please try again later.";
      linkStatus.type = AlertType.ERROR;
      return;
    }
    if (filtered.some((x) => x.id == e.detail.item.id)) {
      linkStatus.message = "Link already exists.";
      linkStatus.type = AlertType.ERROR;
      return;
    }
    linker.link($node.focusedBlock ?? node.id, e.detail.item.id);
    const addedLink = await $dataManager.cacheSource.dexie.node.get(
      e.detail.item.id
    );
    if (!addedLink) {
      linkStatus.message = "Something went wrong. Please try again later.";
      linkStatus.type = AlertType.ERROR;
      return;
    }
    linkStatus.message = "Link added successfully.";
    linkStatus.type = AlertType.SUCCESS;
    filtered = [...filtered, addedLink];
    searchQuery = "";
  }
  async function refresh() {
    const result = await node.fetchLinks();
    console.log({ result });
    if (!result) {
      links = [];
      filtered = [];
      fetchError = "Error fetching links.";
      return;
    }
    links = [
      ...result.from
        .filter((x) => x.in.startsWith("node:"))
        .map((x) => {
          return {
            linkType: x.linkType,
            id: x.in
          };
        }),
      ...result.to
        .filter((x) => x.out.startsWith("node:"))
        .map((x) => {
          return {
            linkType: x.linkType,
            id: x.out
          };
        })
    ];
    console.log({ links });
    applyFilters();
  }
  async function applyFilters() {
    let linkIds = links
      .filter((x) => x.linkType === selectedLinkType)
      .map((x) => x.id);

    filtered = await $dataManager.cacheSource.dexie.node
      .where("id")
      .anyOfIgnoreCase(linkIds)
      .toArray();
  }
  function onClick(e: CustomEvent) {
    const result = multiSelectStore.clickHandler(e.detail.id);
    if (!result)
      appStore.resourceClickHandler(
        e.detail.event,
        e.detail.id,
        ResourceAccessMode.POP
      );
  }
  function onSelectAll() {
    $multiSelectStore = filtered?.map((x) => x.id) ?? [];
  }

  function onAction(e: CustomEvent) {
    console.log("onAction", e);
    if (e.detail.action === "unlink") {
      filtered = filtered.filter((x) => x.id != e.detail.id);
    }
  }
</script>

<div class="relative flex flex-col gap-3 pt-1 h-full w-full">
  <div class="flex flex-col w-full">
    <LinkSearch context="nodepage" on:select={onSelect} bind:searchQuery />
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
    <OptionSelector
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
          label: "Mentions",
          value: LinkType.MENTION,
          icon: "at-symbol"
        },
        {
          label: "Suggestions",
          value: LinkType.SUGGESTION,
          icon: "light-bulb"
        }
      ]}
    />
    {#if fetchError}
      <ErrorStatusPane error={fetchError} />
    {:else if filtered.length > 0}
      <LinkItems
        links={filtered}
        accessPointId={node.id}
        on:click={onClick}
        on:action={onAction}
      />
      <ScrollViewBottomSpacer />
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
    <BottomFloat class="mb-20 w-full">
      <BulkEditBar
        size={Size.sm}
        context={multiSelectContext}
        on:selectAll={onSelectAll}
      />
    </BottomFloat>
  {/if}
</div>
