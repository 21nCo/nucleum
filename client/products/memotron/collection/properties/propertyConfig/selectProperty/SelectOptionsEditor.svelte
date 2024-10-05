<script lang="ts">
  import { reorderList } from "$lib/client/actions/rearrange.action";
  import Icon from "$lib/client/elements/Icon.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import type { PropertyConfig } from "../../property.type";
  import SelectOptionListView from "./SelectOptionListView.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let config: PropertyConfig;
  let isGrouping = false;
  let focusedOptionId: string | null = null;
  let dev_isEnableGrouping = false;
  function generateNewOption() {
    return {
      label: "",
      order: config.options?.length ?? 0,
      id: generateSimpleRandomId()
    };
  }
  function onremove(e: CustomEvent<string>) {
    console.log("remove", e.detail);
    const id = e.detail;
    config.options = config.options?.filter((option) => option.id !== id);
    focusedOptionId = null;
    propagateChange();
  }
  function ondefault(e: CustomEvent<string>) {
    console.log("default", e.detail);
  }
  function onenter(e: CustomEvent<string>) {
    console.log("enter", e.detail);
    focusedOptionId = null;
  }
  function propagateChange() {
    dispatch("change");
  }
</script>

<div class="flex flex-col h-full w-full">
  {#if dev_isEnableGrouping}
    <span class="flex justify-between w-full p-3 border-b border-b-brs2">
      <Text content="Options" style={TextStyle.SECTION_HEADING} />
      <SwitchInput
        bind:checked={isGrouping}
        label={{ label: "Grouping" }}
        size={Size.sm}
      />
    </span>
  {/if}
  <div
    class="flex flex-col gap-3 flex-grow p-3"
    use:reorderList={{
      listId: "options",
      draggedOverClass: "outline outline-aps1"
    }}
    on:reorder
  >
    {#if isGrouping && config.groups}
      {#each config.groups as group}
        <!-- content here -->
      {/each}
    {:else if config.options}
      <SelectOptionListView
        bind:options={config.options}
        {focusedOptionId}
        on:enter={onenter}
        on:default={ondefault}
        on:remove={onremove}
      />
      {#if !focusedOptionId}
        <button
          class="flex gap-2 items-center border border-brs3 w-full rounded-md h-9 text-fgs3 p-1.5 text-b2"
          on:click={(e) => {
            if (!config.options) return;
            const newOption = generateNewOption();
            config.options = [...config.options, newOption];
            focusedOptionId = newOption.id;
            console.log("config.options - added a new option", config.options);
            e.stopPropagation();
          }}
        >
          <Icon icon="plus" class="stroke-fgs3" />
          <span> Add option </span>
        </button>
      {/if}
    {/if}
  </div>
</div>
