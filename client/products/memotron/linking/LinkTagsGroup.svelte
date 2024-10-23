<script lang="ts">
  import { hoverable } from "$lib/client/actions/hover.action";
  import { logger } from "$lib/client/components/debug/logger.client";
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import Tag from "$lib/client/elements/text/Tag.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import context from "$lib/client/stores/context.store";
  import { confirmationNotification } from "$lib/client/stores/notification.store";
  import view from "$lib/client/stores/view.store";
  import {
    ButtonStyle,
    ButtonVariant,
    type IButtonParams
  } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ILinkTagGroup } from "./link.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let group: ILinkTagGroup;
  $: isWithoutGroup = group.group === "" || !group.group;
  let isHovered = false;
  let inputValueWithinGroup = "";
  let addTagPopover: Popover;
  let editTagPopover: Popover;
  let isEditingGroupName = false;
  let errorMessage = "";

  const buttonProps: IButtonParams = {
    size: Size.xs,
    isPreventMinWidth: true,
    style: ButtonStyle.OUTLINED
  };

  function save(groupSelected?: string) {
    if (!inputValueWithinGroup) {
      errorMessage = "Tag cannot be empty";
      addTagPopover?.hide();
      return;
    }
    dispatch("save", {
      group: groupSelected ?? "",
      label: inputValueWithinGroup
    });
    inputValueWithinGroup = "";
    addTagPopover?.hide();
  }

  function onUpdateGroupName() {
    dispatch("updateGroupName", {
      group: group.group,
      newgroup: inputValueWithinGroup
    });
    onGroupNameCancel();
  }

  function onGroupNameCancel() {
    isEditingGroupName = false;
    inputValueWithinGroup = "";
  }
</script>

<div
  class={cn("flex flex-col items-start gap-3 border rounded-md p-4 w-full", {
    "border-brs2": !isHovered || isWithoutGroup,
    "border-brs3": isHovered && !isWithoutGroup
  })}
  use:hoverable={{
    onHover: (e) => (isHovered = e)
  }}
>
  <div class="flex gap-6 w-full h-8 justify-between items-center">
    {#if isEditingGroupName}
      <TextInput
        bind:value={inputValueWithinGroup}
        placeholder="Edit group name"
        on:enter={onUpdateGroupName}
        isShowRightControls={true}
        on:save={onUpdateGroupName}
        on:cancel={onGroupNameCancel}
      />
    {:else}
      <Text
        content={group.group ? group.group + ":" : "No group"}
        style={TextStyle.SECTION_HEADING}
      />
    {/if}
    {#if (isHovered || $context.isTouchDevice) && !isWithoutGroup}
      <div class="flex gap-2 items-center">
        {#if !isEditingGroupName}
          <Button
            icon="ph:pencil-simple-line-light"
            label={$view.isConstrainedWidth ? undefined : "Edit group name"}
            {...buttonProps}
            on:click={() => {
              isEditingGroupName = true;
              inputValueWithinGroup = group.group;
            }}
          />
        {/if}
        <Popover bind:this={addTagPopover}>
          <Button
            icon="ph:plus"
            label={$view.isConstrainedWidth ? undefined : "Add tag"}
            {...buttonProps}
            on:click={() => {}}
          />
          <div slot="popover" class="flex flex-col items-center gap-6 p-3 w-80">
            <TextInput
              bind:value={inputValueWithinGroup}
              placeholder={`Add tag ${group.group ? `to ${group.group}` : ""}`}
            />
            <span>
              <Button
                label="Save"
                on:click={() => save(group.group)}
                size={Size.sm}
              />
            </span>
          </div>
        </Popover>
        <Button
          icon="ph:trash-light"
          label={$view.isConstrainedWidth ? undefined : "Delete all"}
          {...buttonProps}
          type={ButtonVariant.DANGER}
          on:click={() => {
            confirmationNotification.notify({
              title: "Delete all tags",
              message: `Are you sure you want to delete all tags ${group.group ? `in **${group.group}**` : "without prefix"}?`,
              confirmAction: {
                label: "Proceed",
                variant: ButtonVariant.DANGER,
                callback: async () => {
                  dispatch("bulkDelete", group.group);
                  return true;
                }
              }
            });
          }}
        />
      </div>
    {/if}
  </div>
  <div class="flex gap-2 flex-wrap">
    {#each group.items as item (item.id)}
      <!-- <button
        class="text-b2 px-3 py-1 border border-brs2 rounded-md hover:bg-bgs2 cursor-pointer"
        >{item.label}</button
      > -->
      {#if item.label}
        <Popover
          bind:this={editTagPopover}
          on:hide={() => {
            inputValueWithinGroup = "";
          }}
        >
          <Tag
            label={item.label}
            icon="ph:tag-light"
            on:click={() => {
              inputValueWithinGroup = item.label ?? "";
            }}
            on:remove={() => {
              dispatch("remove", item.id);
            }}
          />
          <div slot="popover" class="flex flex-col items-center gap-6 p-3 w-80">
            <TextInput
              bind:value={inputValueWithinGroup}
              placeholder="Editing tag"
            />
            <span>
              <Button
                label="Update"
                on:click={(e) => {
                  dispatch("update", {
                    id: item.id,
                    label: inputValueWithinGroup
                  });
                  editTagPopover?.hide();
                  inputValueWithinGroup = "";
                }}
                size={Size.sm}
              />
            </span>
          </div>
        </Popover>
      {/if}
    {/each}
  </div>
  {#if errorMessage}
    <InlineErrorMessage bind:error={errorMessage} />
  {/if}
</div>
