<script lang="ts">
  import Divider from "@21n/elements/Divider.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import { InputStyle } from "@21n/types/input.type";
  import { cn } from "@21n/utils/ui.utils";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import { NestedListStyle, type NestedItemContent } from "@21n/components/nestedList/nestedList.type";
  import NestedListItem from "@21n/components/nestedList/NestedListItem.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let items: string[] = [];
  export let contentCallback: (id: string) => Promise<NestedItemContent>;
  export let childrenCallback: (id: string) => Promise<IRecordId[]>;
  export let style: NestedListStyle = NestedListStyle.DEFAULT;
  export let isExpandOnClickAnywhere: boolean = false;
  export let isShowAddTextInput: boolean = false;
  export let addPlaceholder: string = "Add new item";
  let addTextInputValue: string = "";
  let expandedItem: IRecordId | undefined = undefined;

  function onAdd() {
    dispatch("add", {
      label: addTextInputValue
    });
    addTextInputValue = "";
  }
</script>

{#if isValidArrayWithData(items) || isShowAddTextInput}
  <div
    class={cn("flex flex-col w-full h-full", {
      "border border-brs3 rounded-md": style === NestedListStyle.OUTLINED
    })}
  >
    {#if isValidArrayWithData(items)}
      {#each items as item, index (item)}
        <NestedListItem
          id={item}
          {index}
          totalLength={items.length}
          {style}
          {contentCallback}
          {childrenCallback}
          {isExpandOnClickAnywhere}
          {isShowAddTextInput}
          {expandedItem}
          on:click
          on:addSub
          on:expand={(e) => {
            if (e.detail) expandedItem = e.detail;
          }}
        />
        {#if style === NestedListStyle.OUTLINED && index !== items.length - 1}
          <Divider />
        {/if}
      {/each}
    {/if}
    {#if isShowAddTextInput}
      <div class="flex p-3">
        <TextInput
          bind:value={addTextInputValue}
          style={InputStyle.PLAIN}
          icon="plus"
          placeholder={addPlaceholder}
          isShowSaveControl={addTextInputValue !== ""}
          on:save={onAdd}
          on:cancel={() => (addTextInputValue = "")}
          on:enter={onAdd}
        />
      </div>
    {/if}
  </div>
{/if}
