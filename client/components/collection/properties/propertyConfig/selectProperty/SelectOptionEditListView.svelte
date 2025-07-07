<script lang="ts">
  import type { IPropertyConfigOption } from "../../property.type";
  import SelectOptionEditItemView from "./SelectOptionEditItemView.svelte";
  import type { IPropertyConfigOptionGroup } from "../../property.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let options: IPropertyConfigOption[];
  export let group: IPropertyConfigOptionGroup | undefined = undefined;
  export let focusedOptionId: string | null = null;
  export let defaultOptionId: string | null = null;
  export let isPreventDefaultGroupLabel = false;
  export let parentBgIndex: number = 1;
  let isEditingGroupLabel = false;
  let groupLabelInput = "";
  $: _options = filterOptions(options, group);

  function filterOptions(
    options: IPropertyConfigOption[],
    group: IPropertyConfigOptionGroup | undefined
  ) {
    if (group) {
      return options?.filter((x) => x.groupId === group.id) ?? [];
    } else {
      return options?.filter((x) => !x.groupId) ?? [];
    }
  }

  function addOption() {
    dispatch("add", group?.id);
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex justify-between items-center pl-2">
    {#if isEditingGroupLabel}
      <TextInput
        bind:value={groupLabelInput}
        isShowSaveControl={true}
        placeholder="Group name"
        on:save={() => {
          if (!groupLabelInput) return;
          if (group) group.label = groupLabelInput;
          isEditingGroupLabel = false;
        }}
        on:cancel={() => {
          isEditingGroupLabel = false;
        }}
      />
    {:else if !isPreventDefaultGroupLabel}
      <button
        class="text-b2 text-fgs3 text-left"
        data-popover-id="select-options-popover"
        on:click={() => {
          if (!group) return;
          isEditingGroupLabel = true;
          groupLabelInput = group.label;
        }}
      >
        {group?.label ?? "Ungrouped"}
      </button>
    {/if}
    {#if group}
      <span class="flex items-center">
        {#if !isEditingGroupLabel}
          <Button
            icon="ph:pencil-simple-light"
            tooltip="Edit group label"
            size={Size.sm}
            on:click={() => {
              isEditingGroupLabel = true;
              groupLabelInput = group.label;
            }}
          />
        {/if}
        <Button
          icon="ph:arrow-up"
          style={ButtonStyle.PLAIN}
          tooltip="Move this group up"
          size={Size.sm}
          on:click={() => {
            dispatch("group", {
              action: "up",
              groupId: group.id
            });
          }}
        />
        <Button
          icon="ph:arrow-down"
          style={ButtonStyle.PLAIN}
          tooltip="Move this group down"
          size={Size.sm}
          on:click={() => {
            dispatch("group", {
              action: "down",
              groupId: group.id
            });
          }}
        />
        <Button
          icon="ph:trash"
          style={ButtonStyle.PLAIN}
          type={ButtonVariant.DANGER}
          tooltip="Delete this group"
          size={Size.sm}
          on:click={() => {
            dispatch("group", {
              action: "delete",
              groupId: group.id
            });
          }}
        />
      </span>
    {/if}
  </div>
  {#each _options as option, index (option.id)}
    <SelectOptionEditItemView
      {option}
      {index}
      {parentBgIndex}
      groupId={group?.id ?? "ungrouped"}
      isFocusing={option.id === focusedOptionId}
      isDefault={option.id === defaultOptionId}
      on:remove
      on:default
      on:enter
      on:change
    />
  {/each}
  <div class="flex justify-center mt-1">
    <Button
      label="+ Add new option"
      style={ButtonStyle.PLAIN}
      size={Size.sm}
      isUnderlined={true}
      on:click={() => addOption()}
    />
  </div>
</div>
