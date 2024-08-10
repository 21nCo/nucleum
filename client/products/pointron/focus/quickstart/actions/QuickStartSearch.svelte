<script lang="ts">
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import type { IEvent } from "$lib/client/types/event.type";
  import { InputStyle } from "$lib/client/types/input.type";
  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();
  export let value = "";
  let searchInputRef: any;
  let placeholder = "search goals [Shift + Q]";
  onMount(() => {
    const appEventSub = appEvents.subscribe((x: IEvent) => {
      console.log({ x });
      if (x.event === GlobalEvent.ACTIVATE_SEARCH_BOX) {
        searchInputRef?.focus();
      }
    });
    return () => {
      appEventSub();
    };
  });
</script>

<div class="flex px-2 py-1.5 rounded-full border border-brs3">
  <TextInput
    bind:this={searchInputRef}
    icon="search"
    style={InputStyle.PLAIN}
    {placeholder}
    bind:value
    on:change={() => dispatch("search")}
  />
</div>
