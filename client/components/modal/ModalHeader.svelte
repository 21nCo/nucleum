<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let title: string;
  export let isShowClose: boolean = false;
</script>

<div class="popover-header flex w-full justify-between rounded-t-md">
  <Text style={TextStyle.PANEL_HEADING} width="min-w-fit" content={title} />
  {#if isShowClose}
    <div class="w-full flex justify-end text-b2">
      <Button
        icon="cross-circled"
        size={Size.lg}
        on:click={() => dispatch("close")}
      />
    </div>
  {/if}
</div>
