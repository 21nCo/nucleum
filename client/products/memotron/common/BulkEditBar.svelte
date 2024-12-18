<script lang="ts">
  import { resolveMultiSelectStore } from "$lib/client/components/flux/resourceStores/resource.store";
  import {
    ResourceAccessPoint,
    type IMultiSelectContext
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import { LinkType } from "../node/node.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import appearance from "$lib/client/stores/appearance.store";
  import { Theme } from "$lib/client/types/appearance.type";
  const dispatch = createEventDispatcher();
  export let context: IMultiSelectContext;
  export let subContext: string = "";
  export let isConstrainedWidth: boolean = false;
  $: multiSelectStore = resolveMultiSelectStore(context);
  const miniButtonProps: {} = {
    size: Size.md,
    style: ButtonStyle.OUTLINED,
    isPreventMinWidth: true
  };
  const expandedButtonProps: {} = {
    size: Size.sm,
    style: ButtonStyle.OUTLINED,
    isPreventMinWidth: true
  };
  $: buttonProps = isConstrainedWidth ? miniButtonProps : expandedButtonProps;
  $: selector =
    $appearance?.colorScheme?.tailwindSelector?.replace("light", "dark") ?? "";
  $: parentBgIndex = $appearance.theme === Theme.LIGHT ? 1 : 3;
</script>

<!-- TODO - invert color layer with corresponding opposite light/dark color scheme -->
<div
  class={cn(
    "flex gap-3 justify-between items-center bg-bgs1 dark:bg-bgs3 text-fgs1 border border-brs3 shadow-md rounded-md overflow-auto",
    {
      [selector]: $appearance.theme === Theme.LIGHT,
      "w-full mx-2 px-4 py-2 text-b2": isConstrainedWidth,
      "w-full mx-8 px-6 py-3": !isConstrainedWidth
    }
  )}
>
  <span class="flex whitespace-nowrap">
    Selected: {$multiSelectStore.length}
  </span>
  <span class="flex gap-2">
    {#if context.accessPoint === ResourceAccessPoint.NODE_LINKS && subContext === LinkType.DIRECT}
      <Button
        tooltip="Unlink"
        icon="ph:link-break-light"
        {parentBgIndex}
        {...buttonProps}
        on:click={() => {
          dispatch("action", "unlink");
        }}
      />
    {:else if context.accessPoint === ResourceAccessPoint.COLLECTION}
      <Button
        label={isConstrainedWidth ? undefined : "Remove from collection"}
        tooltip={isConstrainedWidth ? "Remove from collection" : undefined}
        icon="ph:minus-circle-light"
        {parentBgIndex}
        {...buttonProps}
        on:click={() => {
          dispatch("action", "unlink");
        }}
      />
    {:else if context.accessPoint === ResourceAccessPoint.BROWSER || context.accessPoint === ResourceAccessPoint.LIBRARY}
      {#if context.resource === Resource.node}
        {#if isConstrainedWidth}
          <Button
            tooltip="Link to node or Add to collection"
            icon="ph:link-light"
            {parentBgIndex}
            {...miniButtonProps}
            on:click={() => {
              dispatch("action", "linkbox");
            }}
          />
        {:else}
          <Button
            label="Link to node"
            icon="ph:link-light"
            {parentBgIndex}
            {...expandedButtonProps}
            on:click={() => {
              dispatch("action", "link");
            }}
          />
          <Button
            label="Add to collection"
            icon="ph:plus-light"
            {parentBgIndex}
            {...expandedButtonProps}
            on:click={() => {
              dispatch("action", "collect");
            }}
          />
        {/if}
      {/if}
      {#if subContext.includes("starred")}
        <Button
          label={isConstrainedWidth ? undefined : "Unstar"}
          tooltip={isConstrainedWidth ? "Unstar" : undefined}
          icon="star"
          {...buttonProps}
          on:click={() => {
            dispatch("action", "unstar");
          }}
        />
      {:else}
        <Button
          label={isConstrainedWidth ? undefined : "Star"}
          tooltip={isConstrainedWidth ? "Star" : undefined}
          icon="star"
          {parentBgIndex}
          {...buttonProps}
          on:click={() => {
            dispatch("action", "star");
          }}
        />
      {/if}
    {/if}

    {#if subContext.includes("archived")}
      <Button
        label={isConstrainedWidth ? undefined : "Unarchive"}
        tooltip={isConstrainedWidth ? "Unarchive" : undefined}
        icon="archive"
        {parentBgIndex}
        {...buttonProps}
        on:click={() => {
          dispatch("action", "unarchive");
        }}
      />
    {:else}
      <Button
        label={isConstrainedWidth ? undefined : "Archive"}
        tooltip={isConstrainedWidth ? "Archive" : undefined}
        icon="archive"
        {parentBgIndex}
        {...buttonProps}
        on:click={() => {
          dispatch("action", "archive");
        }}
      />
    {/if}
    <Button
      label={isConstrainedWidth ? undefined : "Delete"}
      tooltip={isConstrainedWidth ? "Delete" : undefined}
      icon="trash"
      {parentBgIndex}
      {...buttonProps}
      type={ButtonVariant.DANGER}
      on:click={() => {
        dispatch("action", "delete");
      }}
    />
  </span>
  <span class="flex gap-2 items-center">
    <Button
      label={isConstrainedWidth ? undefined : "Select all"}
      tooltip={isConstrainedWidth ? "Select all" : undefined}
      {parentBgIndex}
      {...buttonProps}
      style={ButtonStyle.DEFAULT}
      icon="check-circle"
      on:click={() => {
        dispatch("selectAll");
      }}
    />
    <Button
      label={isConstrainedWidth ? undefined : "Clear selection"}
      tooltip={isConstrainedWidth ? "Clear selection" : undefined}
      icon={isConstrainedWidth ? "cross" : "cross-circled"}
      {parentBgIndex}
      {...buttonProps}
      style={ButtonStyle.DEFAULT}
      on:click={() => {
        $multiSelectStore = [];
      }}
    />
  </span>
</div>
