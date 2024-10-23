<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import type { IResourceSwitchItem } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { createEventDispatcher } from "svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { SearchType } from "$lib/client/types/data.type";
  import { InputStyle } from "$lib/client/types/input.type";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import view from "$lib/client/stores/view.store";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  const dispatch = createEventDispatcher();
  export let selectedResource: Resource;
  export let resources: IResourceSwitchItem[];
  export let variant: "v1" | "v2" | "v3";
  export let searchQuery: string = "";
  export let isStickied: boolean = false;
  export let searchStore;
  export let selectedSubType: any;
  let isFiltersVisible: boolean = false;
  let isSearchFocused: boolean = false;
  function onKeydown(event: any) {}
  function onKeyup(event: any) {
    refresh();
  }
  function refresh() {
    dispatch("refresh");
  }
</script>

{#if $view.isConstrainedWidth}
  <div class="flex gap-4 pt-4 px-4">
    <TextInput
      bind:value={searchQuery}
      on:keydown={onKeydown}
      style={InputStyle.FILLED}
      on:keyup={onKeyup}
      placeholder={"Search " + selectedResource + "s"}
    />

    <button
      class="flex items-center justify-center bg-bgs2 rounded-md h-full min-w-11"
      on:click={() => {
        dispatch("create");
      }}
    >
      <Icon icon="ph:plus" />
    </button>
  </div>
{:else}
  <div class="flex flex-col bg-bgs1 sticky top-0 z-20 shadow--sm">
    <div class="flex w-full justify-between p-5 py-4 pt-5 leading-none">
      <input
        class="text-h2 w-full bg-transparent focus:outline-none focus:border-none"
        type="text"
        bind:value={searchQuery}
        on:keydown={onKeydown}
        on:keyup={onKeyup}
        on:focus={() => (isSearchFocused = true)}
        on:blur={() => (isSearchFocused = false)}
        placeholder={"Search " + selectedResource + "s"}
      />
      <div class="flex items-center gap-2">
        {#if isStickied}
          <DropDown
            bind:value={selectedResource}
            items={resources}
            on:select={refresh}
          />
        {/if}
        {#if $userPreferences.localAI.semanticSearch && selectedSubType === "nodular_markdown"}
          <SwitchInput
            label={{ label: "Semantic", orientation: Orientation.Horizontal }}
            size={Size.sm}
            style={InputStyle.PLAIN}
            on:change={(e) => dispatch("semanticSearch", e.detail)}
            checked={searchStore.searchType === SearchType.SEMANTIC}
          />
        {/if}
        {#if isFiltersVisible}
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
        <!-- {#if variant === "v1" || variant === "v3"}
        <Toggle icon="ph:faders" bind:on={isFiltersVisible} />
      {/if} -->
      </div>
    </div>
    <Divider
      colorStrength={isSearchFocused
        ? ColorStrength.ExtraStrong
        : ColorStrength.Normal}
    />
  </div>
{/if}

<style>
  input::placeholder {
    font-weight: 300;
    /* Avenir needs to be lighter */
    /* font-weight: lighter; */
    /* font-style: italic; */
    color: rgba(var(--colors-fgs2), 0.4);
  }
</style>
