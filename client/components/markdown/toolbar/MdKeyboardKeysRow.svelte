<script lang="ts">
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import KeyboardToolbarKey from "$lib/client/elements/keyboardToolbar/KeyboardToolbarKey.svelte";
  import { createEventDispatcher } from "svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { fly } from "svelte/transition";
  const dispatch = createEventDispatcher();
</script>

<div
  class={cn(
    "flex items-center justify-start gap-1.5 min-w-0 flex-1 h-full overflow-x-auto text-fgs1 pr-1 pl-2 bg-bgs2",
    {
      // "bg-[#D1D4D9] dark:bg-[#2b2b2d]": $context.os === OperatingSystem.IOS
      // "[background:linear-gradient(65deg,#D1D4D9_0%,#D1D4D9_90%,white_90%,white_100%)] dark:[background:linear-gradient(65deg,#2C2C2C_0%,#2C2C2C_90%,black_90%,black_100%)]":
      //   $context.os === OperatingSystem.IOS
    }
  )}
  in:fly={{ y: 10 }}
>
  <KeyboardToolbarKey
    icon="ph:at"
    on:click={(e) => {
      dispatch("key", "@");
    }}
  />
  <KeyboardToolbarKey
    icon="ph:hash"
    on:click={(e) => {
      dispatch("key", "#");
    }}
  />
  <KeyboardToolbarKey
    icon="ph:asterisk"
    on:click={(e) => {
      dispatch("key", "*");
    }}
  />
  <KeyboardToolbarKey
    icon="ph:quotes"
    on:click={(e) => {
      dispatch("key", '"');
    }}
  />
  <KeyboardToolbarKey
    icon="ph:brackets-square-light"
    on:click={(e) => {
      dispatch("key", "[]");
    }}
  />
  <KeyboardToolbarKey
    icon="hugeicons:solid-line-01"
    on:click={(e) => {
      dispatch("key", "-");
    }}
  />
  <button
    class="p-1 h-[42px] rounded-md flex items-center justify-center flex-1 min-w-0 hover:bg-bgs3"
    on:click={(e) => {
      dispatch("close");
    }}
  >
    <Icon icon="ph:caret-line-down-light" />
  </button>
</div>
