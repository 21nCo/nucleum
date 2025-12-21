<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import ComponentResolver from "../paint/ComponentResolver.svelte";
  import type { IAction } from "@21n/types/action.type";
  import { Size } from "@21n/types/size.enum";
  export let action: IAction;
</script>

<div
  class={cn(
    "flex justify-center items-center h-full bg-bgs2 border-l border-brs3 transition-all duration-200",
    {
      "min-w-80 w-80 2k:min-w-96 2k:w-96":
        action.liveActionParams?.size === Size.sm,
      "min-w-96 w-96 2k:min-w-128 2k:w-128":
        !action.liveActionParams?.size ||
        action.liveActionParams?.size === Size.md
    }
  )}
>
  <ComponentResolver {action} />
</div>
