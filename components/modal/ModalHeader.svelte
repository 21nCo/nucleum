<script lang="ts">
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let title: string;
  export let isShowClose: boolean = false;
</script>

<div class="popover-header flex w-full justify-between rounded-t-md">
  <Text style={TextStyle.PANEL_HEADING} width="min-w-fit" content={title} />
  {#if isShowClose}
    <div class="w-full flex justify-end text-b2">
      <Icon icon="cross" on:click={() => dispatch("close")} />
    </div>
  {/if}
</div>
