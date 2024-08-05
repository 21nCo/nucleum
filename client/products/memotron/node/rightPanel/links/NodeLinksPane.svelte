<script lang="ts">
  import { onMount } from "svelte";
  import type { IActiveNodeStore } from "../../node.store";
  import LinkSearch from "../../../common/linkbox/LinkSearch.svelte";
  import { linker } from "../../../memotron.store";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { LinkType, type INode } from "../../node.type";
  import LinkItems from "./LinkItems.svelte";
  import MultiselectDropdown from "$lib/client/elements/dropdown/MultiselectDropdown.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import ErrorStatusPane from "$lib/client/elements/feedback/ErrorStatusPane.svelte";
  export let node: IActiveNodeStore;
  let links: { id: string; linkType: LinkType }[] = [];
  let filtered: INode[] = [];
  let selectedLinkType: LinkType = LinkType.DIRECT;
  let selectedLinkTags: string[] = [];
  let error: string | undefined = undefined;
  let previousFocus: string;
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
    if (!e.detail.item.id) return;
    if (filtered.some((x) => x.id == e.detail.item.id)) return;
    linker.link($node.focusedBlock ?? node.id, e.detail.item.id);
    filtered = [...filtered, e.detail.item.id];
  }
  async function refresh() {
    const result = await node.fetchLinks();
    console.log({ result });
    if (!result) {
      links = [];
      filtered = [];
      error = "Error fetching links.";
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
</script>

<div class="flex flex-col gap-12 h-full w-full">
  <div class="flex flex-col gap-3 w-full">
    <LinkSearch context="nodepage" on:select={onSelect} />
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
    <!-- <div class="flex gap-3 w-full">
      <MultiselectDropdown
        options={[]}
        style={InputStyle.FILLED}
        bind:selected={selectedLinkTags}
        placeholder="Link tags"
      />
    </div> -->
  </div>

  {#if error}
    <ErrorStatusPane {error} />
  {:else if filtered.length > 0}
    <LinkItems links={filtered} />
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
