<script lang="ts">
  import { tooltip } from "$lib/client/actions/popover.action";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { fly } from "svelte/transition";
  import { GoalStatus } from "../goal.type";
  import { resolveGoalStatusIcon } from "../goal.utils";
  export let status: GoalStatus;
  export let isActive = false;
  export let isAccent = false;
</script>

<button
  class={cn("flex relative z-20 items-center gap-2 p-1.5 px-3 rounded-md", {
    "bg-ccs1 text-cbg": isActive || isAccent,
    "bg-bgs3 notouch:hover:bg-bgs4 active:bg-bgs4": !isActive && !isAccent
  })}
  use:tooltip={{
    disabled: isActive,
    text: `Change to **${enumToString(status)}**`
  }}
  on:click
>
  <Icon
    icon={status === GoalStatus.COMPLETED
      ? "check-circle"
      : resolveGoalStatusIcon(status)}
    size={Size.sm}
    class={cn({
      "text-cbg": isActive || isAccent,
      "text-fgs3": !isActive && !isAccent
    })}
  />
  {#if isActive}
    <span
      class="text-b2 whitespace-nowrap"
      in:fly={{
        duration: 100,
        x: 10
      }}>{enumToString(status)}</span
    >
  {/if}
</button>
