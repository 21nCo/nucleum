<script lang="ts">
  import type { PropertyConfig } from "$lib/tidy/types/memotron/type.type";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import SwitchInput from "$lib/tidy/elements/toggle/SwitchInput.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import { generateUID } from "$lib/tidy/utils/utils";
  import SelectOptionListView from "./SelectOptionListView.svelte";
  export let config: PropertyConfig;
  let isGrouping = false;
  let focusedOptionId: string | null = null;
  function generateNewOption() {
    return {
      label: "",
      order: config.options?.length ?? 0,
      id: generateUID()
    };
  }
  function onremove(e: CustomEvent<string>) {
    console.log("remove", e.detail);
    const id = e.detail;
    config.options = config.options?.filter((option) => option.id !== id);
    focusedOptionId = null;
  }
  function ondefault(e: CustomEvent<string>) {
    console.log("default", e.detail);
  }
  function onenter(e: CustomEvent<string>) {
    console.log("enter", e.detail);
    focusedOptionId = null;
  }
</script>

<div class="flex flex-col h-full w-full">
  <span class="flex justify-between w-full p-3 border-b border-b-brs2">
    <Text content="Options" style={TextStyle.SECTION_HEADING} />
    <SwitchInput
      bind:checked={isGrouping}
      label={{ label: "Grouping" }}
      size={Size.sm}
      isExpanded={false}
    />
  </span>
  <div class="flex flex-col gap-3 flex-grow p-3">
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
          <Icon icon="plus" color="fgs3" />
          <span> Add option </span>
        </button>
      {/if}
    {/if}
  </div>
</div>
