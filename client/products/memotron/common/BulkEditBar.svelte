<script lang="ts">
  import { resolveMultiSelectStore } from "$lib/client/components/resourceStores/resource.store";
  import { ResourceAccessPoint } from "$lib/client/components/resourceStores/resource.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let context: string = "";
  $: multiSelectStore = resolveMultiSelectStore(context);
  const commonButtonProps: {} = {
    size: size === Size.sm ? Size.lg : Size.sm,
    style: size === Size.sm ? ButtonStyle.DEFAULT : ButtonStyle.OUTLINED,
    isPreventMinWidth: true
  };
</script>

<!-- TODO - invert color layer with corresponding opposite light/dark color scheme -->
<div
  class={cn(
    "flex gap-3 justify-between items-center cs_tidigit_dark_blue bg-bgs1 text-fgs1 border border-brs3 shadow-md rounded-md overflow-auto",
    {
      "w-full mx-2 px-4 py-2 text-b2": size === Size.sm,
      "w-2/3 px-6 py-4": size === Size.md,
      "w-1/2 px-8 py-4": size === Size.lg
    }
  )}
>
  <span class="flex whitespace-nowrap">
    Selected: {$multiSelectStore.length}
  </span>
  <span class="flex gap-2">
    <Button
      {...commonButtonProps}
      label={size === Size.sm ? undefined : "select all"}
      tooltip={size === Size.sm ? "Select all" : undefined}
      icon="check-circle"
      on:click={() => {
        dispatch("selectAll");
      }}
    />
    {#if context.includes(ResourceAccessPoint.NODE_LINKS)}
      <Button
        label={size === Size.sm ? undefined : "Unlink"}
        tooltip="Unlink"
        icon="arrow-uturn-left"
        {...commonButtonProps}
        on:click={() => {
          dispatch("star");
        }}
      />
    {:else}
      <Button
        label={size === Size.sm ? undefined : "star"}
        tooltip={size === Size.sm ? "Star" : undefined}
        icon="star"
        {...commonButtonProps}
        on:click={() => {
          dispatch("star");
        }}
      />
    {/if}

    <Button
      label={size === Size.sm ? undefined : "archive"}
      tooltip={size === Size.sm ? "Archive" : undefined}
      icon="archive"
      {...commonButtonProps}
      on:click={() => {
        dispatch("archive");
      }}
    />
    <Button
      label={size === Size.sm ? undefined : "delete"}
      tooltip={size === Size.sm ? "Delete" : undefined}
      icon="trash"
      {...commonButtonProps}
      type={ButtonVariant.DANGER}
      on:click={() => {
        dispatch("delete");
      }}
    />
  </span>
  <span>
    <Button
      label={size === Size.sm ? undefined : "clear"}
      tooltip={size === Size.sm ? "Clear" : undefined}
      icon={size === Size.sm ? "cross" : "cross-circled"}
      {...commonButtonProps}
      on:click={() => {
        $multiSelectStore = [];
      }}
    />
  </span>
</div>
