<script lang="ts">
  import { hoverable } from "$lib/client/actions/hover.action";
  import { logger } from "$lib/client/components/debug/logger.client";
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { toasts } from "$lib/client/stores/notification.store";
  import {
    ButtonStyle,
    ButtonVariant,
    type IButtonParams
  } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { linkTagStore } from "./link.store";
  import type { ILinkTagGroup } from "./link.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let group: ILinkTagGroup;
  let isHovered = false;
  let inputValueWithinPrefix = "";
  let addTagPopover: Popover;
  const buttonProps: IButtonParams = {
    size: Size.xs,
    isPreventMinWidth: true,
    style: ButtonStyle.OUTLINED
  };

  function save(prefixSelected?: string) {
    dispatch("save", {
      prefix: prefixSelected ?? "",
      label: inputValueWithinPrefix
    });
    inputValueWithinPrefix = "";
    addTagPopover.hide();
  }
</script>

<div
  class="flex flex-col items-start gap-3 border border-brs2 rounded-md p-4 w-full"
  use:hoverable
  on:hover={(e) => (isHovered = e.detail)}
>
  <div class="flex w-full justify-between items-center">
    <Text
      content={group.prefix ? group.prefix : "Without prefix"}
      style={TextStyle.PANEL_HEADING_SMALL}
    />
    {#if isHovered}
      <div class="flex gap-2 items-center">
        <Popover bind:this={addTagPopover}>
          <Button
            icon="ph:plus"
            label="Add tag"
            {...buttonProps}
            on:click={() => {}}
          />
          <div slot="popover" class="flex flex-col items-center gap-6 p-3 w-80">
            <TextInput
              bind:value={inputValueWithinPrefix}
              placeholder={`Add tag ${group.prefix ? `to ${group.prefix}` : ""}`}
            />
            <span>
              <Button
                label="Save"
                on:click={() => save(group.prefix)}
                size={Size.sm}
              />
            </span>
          </div>
        </Popover>
        <Button
          icon="ph:trash-light"
          label="Delete"
          {...buttonProps}
          type={ButtonVariant.DANGER}
          on:click={() => {}}
        />
      </div>
    {/if}
  </div>
  <div class="flex gap-2 flex-wrap">
    {#each group.items as item}
      <button
        class="text-b2 px-3 py-1 border border-brs2 rounded-md hover:bg-bgs2 cursor-pointer"
        >{item.label}</button
      >
    {/each}
  </div>
</div>
