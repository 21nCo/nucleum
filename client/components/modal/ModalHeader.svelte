<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let title: string;
  export let isShowClose: boolean = false;
</script>

<div
  class={cn("popover-header flex w-full rounded-t-md pt-4", {
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
