<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { IRecordId } from "$lib/client/types/data.type";
  import type { ICombinationItem } from "./combination.type";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import { popover } from "$lib/client/actions/popover.action";
  import { cn } from "$lib/client/utils/ui.utils";

  const dispatch = createEventDispatcher();

  export let item: ICombinationItem;
  export let selectedItemId: IRecordId | null;
  export let isInEditMode: boolean = false;
  export let level: number = 0;
  export let expanded: boolean = false;
  export let itemResourceDataMap: Map<IRecordId, any> = new Map();
  $: resourceData = itemResourceDataMap.get(item.id.toString());

  const resourceOptions: ISelectItem[] = [
    { label: "Node", icon: "ph:article-light", value: Resource.node },
    { label: "Goal", icon: "ph:target-light", value: Resource.goal },
    { label: "Task", icon: "ph:check-square-light", value: Resource.task },
    {
      label: "Collection",
      icon: "ph:brackets-round-light",
      value: Resource.collection
    }
  ];

  let isEditingLabel = false;
  let labelValue = item.customLabel || resourceData?.label || "";
  let isShowingAddInput = false;
  let addInputValue = "";

  $: hasChildren = item.children && item.children.length > 0;
  $: displayLabel = item.customLabel || resourceData?.label || "Untitled";
  $: isSelected = selectedItemId === item.id;

  function getResourceIcon(type: string) {
    switch (type) {
      case "node":
        return "ph:article-light";
      case "goal":
        return "ph:target-light";
      case "task":
        return "ph:check-square-light";
      case "collection":
        return "ph:brackets-round-light";
      default:
        return "ph:file-light";
    }
  }

  function onItemClick() {
    dispatch("select", item.id);
  }

  function onToggleExpanded() {
    if (hasChildren) {
      expanded = !expanded;
      dispatch("expand", { id: item.id, expanded });
    }
  }

  function onSaveLabel() {
    if (labelValue.trim() !== displayLabel) {
      dispatch("updateLabel", { id: item.id, label: labelValue.trim() });
    }
    isEditingLabel = false;
  }

  function onCancelLabelEdit() {
    labelValue = displayLabel;
    isEditingLabel = false;
  }

  function onRemoveItem() {
    dispatch("remove", item.id);
  }

  function onAddSubItem() {
    if (addInputValue.trim()) {
      dispatch("addSub", { parentId: item.id, label: addInputValue.trim() });
      addInputValue = "";
      isShowingAddInput = false;
      expanded = true;
    }
  }

  function onCreateNewResource(resource: Resource) {
    dispatch("createNew", { resource, parentId: item.id });
  }

  function onAddExistingToSub() {
    dispatch("addExisting", item.id);
  }
</script>

<div class="flex flex-col" style="margin-left: {level * 16}px">
  <div
    class={cn(
      "flex items-center justify-between p-2 rounded-md hover:bg-bgs3 group transition-colors",
      {
        "bg-aps1 text-abg": isSelected
      }
    )}
  >
    <div class="flex items-center gap-2 flex-1 min-w-0">
      {#if hasChildren}
        <button
          class="flex-shrink-0 p-0.5 rounded hover:bg-bgs3"
          on:click={onToggleExpanded}
        >
          <Icon
            icon={expanded ? "ph:caret-down-light" : "ph:caret-right-light"}
            size={Size.xs}
            class={cn({
              "text-abg": isSelected,
              "text-fgs3": !isSelected
            })}
          />
        </button>
      {:else}
        <div class="w-4 flex-shrink-0"></div>
      {/if}

      {#if isEditingLabel}
        <TextInput
          bind:value={labelValue}
          style={InputStyle.PLAIN}
          placeholder="Item label"
          on:blur={onSaveLabel}
          on:enter={onSaveLabel}
          on:escape={onCancelLabelEdit}
        />
      {:else}
        <button
          class="flex items-center gap-2 flex-1 text-left min-w-0"
          on:click={onItemClick}
        >
          <Icon
            icon={getResourceIcon(resourceData?.type)}
            size={Size.xs}
            class={cn({
              "text-abg": isSelected,
              "text-fgs2": !isSelected
            })}
          />
          <span
            class={cn("truncate text-b3", {
              "text-fgs2": !isSelected,
              "text-abg": isSelected
            })}
          >
            {displayLabel}
          </span>
          {#if item.customLabel}
            <Icon icon="ph:pencil-light" size={Size.xs} class="opacity-50" />
          {/if}
        </button>
      {/if}
    </div>

    {#if isInEditMode}
      <div
        class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {#if !isEditingLabel}
          <button
            class={cn("p-1 rounded hover:bg-bgs3", {
              "text-fgs3": !isSelected,
              "text-abg": isSelected
            })}
            on:click={() => (isEditingLabel = true)}
            title="Edit label"
          >
            <Icon icon="ph:pencil-light" size={Size.xs} />
          </button>
        {/if}

        <div
          use:popover={{
            content: OptionSelector,
            id: `add-sub-${item.id}`,
            componentProps: {
              options: resourceOptions,
              labelProps: { label: "Create new" },
              selected: Resource.node,
              onSelect: onCreateNewResource,
              class: "w-48 bg-bgs1 border border-brs2 shadow-lg rounded-lg"
            }
          }}
        >
          <button
            class={cn("p-1 rounded hover:bg-bgs3", {
              "text-fgs3": !isSelected,
              "text-abg": isSelected
            })}
            title="Add sub-item"
          >
            <Icon icon="ph:plus-light" size={Size.xs} />
          </button>
        </div>

        <button
          class={cn("p-1 rounded hover:bg-bgs3 hover:text-red-500", {
            "text-fgs3": !isSelected,
            "text-abg": isSelected
          })}
          on:click={onRemoveItem}
          title="Remove item"
        >
          <Icon icon="ph:x-light" size={Size.xs} />
        </button>
      </div>
    {/if}
  </div>

  {#if isInEditMode && isShowingAddInput}
    <div class="ml-4 p-2">
      <TextInput
        bind:value={addInputValue}
        style={InputStyle.PLAIN}
        icon="ph:plus-light"
        placeholder="Add sub-item"
        isShowSaveControl={addInputValue !== ""}
        on:save={onAddSubItem}
        on:cancel={() => {
          isShowingAddInput = false;
          addInputValue = "";
        }}
        on:enter={onAddSubItem}
      />
    </div>
  {/if}

  {#if expanded && hasChildren}
    {#each item.children || [] as childItem}
      <svelte:self
        item={childItem}
        {selectedItemId}
        {isInEditMode}
        level={level + 1}
        expanded={false}
        {itemResourceDataMap}
        on:select
        on:expand
        on:updateLabel
        on:remove
        on:addSub
        on:createNew
        on:addExisting
      />
    {/each}
  {/if}
</div>
