<script lang="ts">
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import {
    headingNodeTypes,
    NodeType
  } from "$lib/client/products/memotron/node/node.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { get } from "svelte/store";
  import { activeResourceFilter } from "$lib/client/utils/utils";
  import Resources from "./Resources.svelte";
  import { onMount } from "svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "$lib/client/types/switcher.enum";
  import Divider from "$lib/client/elements/Divider.svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  export let isModal: boolean = false;
  let searchQuery: string = "";
  let selectedResource: string = "everything";
  let selectedTabFilter: string = "all";
  let isFiltersVisible: boolean = false;
  let isStickied: boolean = false;
  let isSearchFocused: boolean = false;
  let data: any[] = [];
  const resources = [
    {
      value: "everything",
      icon: "tag"
    },
    {
      value: "nodes",
      icon: "node"
    },
    {
      value: "collections",
      icon: "curation"
    }
    // {
    //   label: "Combinations",
    //   value: "combinations",
    //   icon: "curation"
    // },
    // {
    //   value: "files",
    //   icon: "folder"
    // },
    // {
    //   label: "Tasks",
    //   value: "tasks",
    //   icon: "folder"
    // },
    // {
    //   value: "clips",
    //   icon: "paper-clip"
    // }
  ];
  const tabs = [
    {
      label: "All",
      value: "all"
    },
    {
      label: "Starred",
      value: "starred"
    },
    {
      label: "Recently opened",
      value: "recent"
    }
  ];
  onMount(async () => {
    await refreshDefaultData();
  });
  function onKeydown(event: any) {
    console.log({ event });
    if (searchQuery) {
      refreshDataUsingSearchQuery();
    } else {
      refreshDefaultData();
    }
  }
  function levenshteinDistance(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  async function refreshDataUsingSearchQuery() {
    const dexie = get(dataManager).cacheSource.dexie;
    if (selectedResource === "everything") {
      data = await dexie.node
        .where("contentType")
        .anyOfIgnoreCase([NodeType.NODULAR_MARKDOWN, ...headingNodeTypes])
        .and((node) => activeResourceFilter(node))
        .reverse()
        .sortBy("modifiedAt");
      data = data.concat(await dexie.collection.reverse().sortBy("modifiedAt"));
    } else if (selectedResource === "nodes") {
      data = await dexie.node
        .where("contentType")
        .anyOfIgnoreCase([NodeType.NODULAR_MARKDOWN, ...headingNodeTypes])
        .and((node) => activeResourceFilter(node))
        .reverse()
        .sortBy("modifiedAt");
    } else if (selectedResource === "collections") {
      data = await dexie.collection
        .filter((collection) => {
          if (!collection.label) return false;
          const labelValue = collection.label.toLowerCase();
          const searchValue = searchQuery.toLowerCase();
          if (labelValue.includes(searchValue)) return true;
          const levenshteinDistanceValue = levenshteinDistance(
            labelValue,
            searchValue
          );
          console.log({ labelValue, searchValue, levenshteinDistanceValue });
          return levenshteinDistanceValue <= 2;
        })
        .toArray();
    }
  }

  async function refreshDataByTabFilter() {
    const dexie = get(dataManager).cacheSource.dexie;
  }

  async function refreshNodes() {
    const dexie = get(dataManager).cacheSource.dexie;
    let query = dexie.node
      .where("contentType")
      .anyOfIgnoreCase([NodeType.NODULAR_MARKDOWN, ...headingNodeTypes]);

    if (selectedTabFilter === "starred") {
      query = query.and((node) => node.isStarred === true);
    }
  }

  async function refreshDefaultData() {
    const dexie = get(dataManager).cacheSource.dexie;
    if (selectedResource === "everything") {
      data = await dexie.node
        .where("contentType")
        .anyOfIgnoreCase([NodeType.NODULAR_MARKDOWN, ...headingNodeTypes])
        .and((node) => activeResourceFilter(node))
        .reverse()
        .sortBy("modifiedAt");
      data = data.concat(await dexie.collection.reverse().sortBy("modifiedAt"));
    } else if (selectedResource === "nodes") {
      data = await dexie.node
        .where("contentType")
        .anyOfIgnoreCase([NodeType.NODULAR_MARKDOWN, ...headingNodeTypes])
        .and((node) => activeResourceFilter(node))
        .reverse()
        .sortBy("modifiedAt");
    } else if (selectedResource === "collections") {
      data = await dexie.collection.reverse().sortBy("modifiedAt");
    }
  }
  function onScroll() {
    var elementTarget = document.querySelector(".resource-switcher");
    var positionFromTop = elementTarget?.getBoundingClientRect().top;
    console.log({ elementTarget, positionFromTop });
    isStickied = positionFromTop ? positionFromTop <= 0 : false;
  }
</script>

<div
  class={cn("w-full h-full flex flex-col overflow-auto", {})}
  on:scroll={onScroll}
>
  <div class="flex flex-col bg-bgs1 sticky top-0 z-20 shadow--sm">
    <!-- <div class="flex w-full justify-end px-4">
      <PanelSwitcher
        items={["All", "Starred", "Recently opened"]}
        style={PanelSwitcherStyle.BAR}
        size={Size.sm}
        isInversePlacement={true}
      />
    </div> -->
    <div class="flex w-full justify-between px-5 py-3 pt-6">
      <input
        class="text-h2 w-full bg-transparent focus:outline-none focus:border-none"
        type="text"
        bind:value={searchQuery}
        on:keydown={onKeydown}
        on:focus={() => (isSearchFocused = true)}
        on:blur={() => (isSearchFocused = false)}
        placeholder="Search library"
      />
      <div class="flex items-center gap-2">
        {#if isStickied}
          <DropDown bind:value={selectedResource} items={resources} />
        {/if}
        {#if isFiltersVisible}
          <SwitchInput
            label={{ label: "Starred", orientation: Orientation.Horizontal }}
            size={Size.sm}
            style={InputStyle.BORDERED}
          />
          <Button
            icon="funnel"
            style={ButtonStyle.OUTLINED}
            size={Size.sm}
            label="Filters"
          />
          <Button
            icon="bars-center-left"
            style={ButtonStyle.OUTLINED}
            size={Size.sm}
            label="Sort"
          />
        {/if}
        <Toggle icon="adjustments-vertical" bind:on={isFiltersVisible} />
      </div>
    </div>
    <Divider
      colorStrength={isSearchFocused
        ? ColorStrength.ExtraStrong
        : ColorStrength.Normal}
    />
  </div>
  <div
    class="flex w-full justify-between items-center px-5 resource-switcher sticky-disabled bg-bgs1 py-6 top-0 z-10"
  >
    <OptionSelector
      options={resources}
      bind:selected={selectedResource}
      on:select={refreshDefaultData}
    />
    <!-- <PanelSwitcher
      items={tabs}
      style={PanelSwitcherStyle.BAR}
      barStyle={BarStyle.DOT}
      size={Size.sm}
      isInversePlacement={true}
      bind:value={selectedTabFilter}
      on:switch={refreshDefaultData}
    /> -->
    <span>
      <SwitchInput
        label={{ label: "Starred", orientation: Orientation.Horizontal }}
        size={Size.sm}
      />
    </span>
  </div>
  <main class="flex flex-col gap-8 w-full grow px-5">
    <div class="flex flex-col grow">
      <Resources {data} {selectedResource} />
    </div>
    <div class="flex w-full justify-center text-b2 text-fgs3">
      Showing &nbsp;
      <b>
        {data.length}
      </b>
      &nbsp;
      {#if searchQuery}
        results containing &nbsp; <b>
          "{searchQuery}"
        </b>
      {:else if selectedTabFilter === "starred"}
        ⭐️ staaarrrrrrrrrred results!
      {:else}
        results
      {/if}
    </div>
    <ScrollViewBottomSpacer />
  </main>
</div>

<style>
  input::placeholder {
    font-weight: lighter;
    color: rgba(var(--colors-fgs2), 0.5);
  }
</style>
