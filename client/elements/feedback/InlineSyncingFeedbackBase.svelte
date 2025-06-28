<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "../Icon.svelte";
  import { scale } from "svelte/transition";
  import { bounceIn } from "svelte/easing";

  export let isFullWidthVariant: boolean = false;
  export let text: string = "Syncing...";
  export let padding: string = "";
  export let isSyncing: boolean = false;
</script>

<span
  class={cn("flex items-center gap-2 text-aps1", padding, {
    "w-full justify-center py-2 bg-aps3 rounded-md": isFullWidthVariant
  })}
  class:hidden={!isSyncing}
  in:scale={{ duration: 200, easing: bounceIn }}
>
  <Icon
    icon={isFullWidthVariant
      ? "svg-spinners:3-dots-fade"
      : "svg-spinners:eclipse-half"}
    size={Size.xs}
    class="text-aps1"
  />
  <span class="text-b3"> {text} </span>
</span>
