<script lang="ts">
  import { tooltip } from "$lib/client/actions/popover.action";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { fly } from "svelte/transition";
  import { TaskStatus } from "../task.type";
  import { resolveTaskStatusIcon } from "../task.utils";
  export let status: TaskStatus;
  export let isActive = false;
  export let isAccent = false;
</script>

<button
  class={cn("flex relative z-20 items-center gap-2 p-1.5 rounded-md", {
    "bg-aps1": isActive || isAccent,
    "bg-bgs3 notouch:hover:bg-bgs4 active:bg-bgs4": !isActive && !isAccent
  })}
  use:tooltip={{
    disabled: isActive,
    text: `Change to **${enumToString(status)}**`,
    direction: Placement.BottomCenter
  }}
  on:click
>
  <Icon
    icon={status === TaskStatus.COMPLETED
      ? "ph:check-circle-light"
      : resolveTaskStatusIcon(status)}
    size={Size.sm}
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
