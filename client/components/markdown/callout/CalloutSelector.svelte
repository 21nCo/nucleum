<script lang="ts">
  import Avatar from "$lib/client/elements/avatarPicker/Avatar.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { markdownSettings } from "../markdown.settings";
  import type { ICalloutSetting } from "../md.type";
  export let selected: ICalloutSetting;
  export let onSelect: (callout: ICalloutSetting) => void;
  export let onEdit: () => void;
</script>

<div
  class="flex flex-col gap-1 text-left border border-brs2 rounded-md p-4 bg-bgs1 w-80"
>
  {#each $markdownSettings.callout as callout}
    <CustomColorPropagator
      color={callout.color}
      type="button"
      class={cn(
        "flex items-center gap-2 border p-2 rounded-md text-ccs1",
        selected?.id === callout.id && "bg-ccs4 border-ccs1",
        selected?.id !== callout.id && "hover:bg-ccs4 border-transparent"
      )}
      on:click={() => {
        selected = callout;
        onSelect?.(callout);
      }}
    >
      <Avatar avatar={callout.avatar} />
      <span>{callout.label}</span>
    </CustomColorPropagator>
  {/each}
  <div class="flex justify-center">
    <Button
      label="Edit"
      size={Size.sm}
      isPreventMinWidth={true}
      on:click={() => {
        onEdit?.();
      }}
    />
  </div>
</div>
