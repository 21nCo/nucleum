<script lang="ts">
  import { reorderList } from "$lib/client/actions/rearrange.action";
  import Icon from "$lib/client/elements/Icon.svelte";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { isTextElement } from "$lib/client/utils/browser.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import type { PropertyConfig } from "../../property.type";
  import SelectOptionListView from "./SelectOptionListView.svelte";
  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();
  export let config: PropertyConfig;
  export let defaultOptionId: string | null = null;
  export let onChange: ((config: PropertyConfig) => void) | undefined =
    undefined;
  export let onDefault: ((defaultOptionId: string) => void) | undefined =
    undefined;
  export let isPopoverContext: boolean = false;
  let isGrouping = false;
  let focusedOptionId: string | null = null;
  let dev_isEnableGrouping = false;
  let error: string | null = null;
  let isCreatedUsingGlobalEnterKey = false;
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
    defaultOptionId = e.detail;
    onDefault?.(e.detail);
  }
  function onenter(e: CustomEvent<string>) {
    if (!e.detail) return;
    const option = config.options?.find((option) => option.id === e.detail);
    if (!option) return;
    if (!option.label && isCreatedUsingGlobalEnterKey) return;
    error = null;
    addOption();
  }
  function propagateChange() {
    dispatch("change", config);
    onChange?.(config);
  }
  function onReorderOptions(
    e: CustomEvent<{ from: number; to: number; listId: string }>
  ) {
    const { from, to, listId } = e.detail;
    if (!listId || listId !== "options") return;
    const [movedItem] = config.options?.splice(from, 1) ?? [];
    config.options?.splice(to, 0, movedItem);
    config = config;
    propagateChange();
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  });

  function handleKeyDown(e: KeyboardEvent) {
    const isTextInputSource = isTextElement(e.target);
    if (e.key === "Enter" && !isTextInputSource) {
      e.stopPropagation();
      addOption();
      isCreatedUsingGlobalEnterKey = true;
      setTimeout(() => {
        isCreatedUsingGlobalEnterKey = false;
      }, 1000);
    }
  }

  function addOption() {
    if (!config.options) return;
    const newOption = generateNewOption();
    config.options = [...config.options, newOption];
    focusedOptionId = newOption.id;
    propagateChange();
  }
</script>

<div
  class={cn("flex flex-col h-full w-full", {
    "min-w-80 min-h-80 bg-bgs1": isPopoverContext
  })}
>
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
    on:reorder={onReorderOptions}
  >
    {#if isGrouping && config.groups}
      {#each config.groups as group}
        <!-- content here -->
      {/each}
    {:else if config.options}
      <SelectOptionListView
        bind:options={config.options}
        {focusedOptionId}
        {defaultOptionId}
        on:enter={onenter}
        on:default={ondefault}
        on:remove={onremove}
        on:change={() => {
          propagateChange();
        }}
      />
      <button
        class="flex gap-2 items-center border border-brs3 w-full rounded-md h-9 text-fgs3 p-1.5 text-b2"
        on:click={(e) => {
          addOption();
          e.stopPropagation();
        }}
      >
        <Icon icon="plus" class="stroke-fgs3" />
        <span> Add option [Enter] </span>
      </button>
    {/if}
  </div>
  <div
    class={cn({
      "py-2": error
    })}
  >
    <InlineErrorMessage bind:error />
  </div>
</div>
