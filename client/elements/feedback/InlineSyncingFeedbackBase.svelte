<script lang="ts">
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import Icon from "@21n/elements/Icon.svelte";
  import { scale } from "svelte/transition";
  import { bounceIn, bounceOut } from "svelte/easing";

  export let isShorter: boolean = false;
  export let text: string | undefined = undefined;
  export let padding: string = "";
  export let isSyncing: boolean = false;
  if (!text && !isShorter) text = "Syncing...";
</script>

<span
  class={cn("flex items-center gap-2", padding, {
    "text-fgs2 px-1": isShorter,
    "text-aps1": !isShorter,
    "w-full justify-center py-2 bg-aps3 rounded-md": !isShorter
  })}
  class:hidden={!isSyncing}
  in:scale={{ duration: 200, easing: bounceIn }}
  out:scale={{ duration: 200, easing: bounceOut }}
>
  <Icon
    icon={isShorter ? "svg-spinners:eclipse-half" : "svg-spinners:3-dots-fade"}
    size={Size.sm}
    class={isShorter ? "text-fgs2" : "text-aps1"}
  />
  {#if text}
    <span class="text-b3"> {text} </span>
  {/if}
</span>
