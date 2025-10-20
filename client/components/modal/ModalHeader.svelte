<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import { ButtonStyle } from "@21n/types/button.type";
  import { TextStyle } from "@21n/types/text.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let title: string;
  export let isShowClose: boolean = false;
</script>

<div
  class={cn("popover-header flex w-full rounded-t-md pt-4 cw:px-3", {
    "justify-between px-3": isShowClose,
    "justify-center": !isShowClose
  })}
>
  <Text style={TextStyle.PANEL_HEADING} width="min-w-fit" content={title} />
  {#if isShowClose}
    <div class="w-full flex justify-end text-b2">
      <Button
        icon="cross"
        style={ButtonStyle.OUTLINED}
        on:click={() => dispatch("close")}
      />
    </div>
  {/if}
</div>
