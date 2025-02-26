<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "$lib/client/types/size.enum";
  import { GoalStatus, type IGoal } from "../goal.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { ResourceAccessPoint } from "../../flux/resourceStores/resource.type";
  import { resolveGoalStatusIcon } from "../goal.utils";

  export let item: IGoal | { label?: string; type: string; status: GoalStatus };
  export let index: number;
  export let totalLength: number;
  export let accessPoint: ResourceAccessPoint | undefined = undefined;
  let isHovering = false;
  $: statusIcon = resolveGoalStatusIcon(item.status);
</script>

<div class="flex flex-col items-center relative z-10">
  <div
    class={cn(
      "w-8 h-8 rounded-full text-fgs3 text-b2 flex items-center justify-center border",
      (!item.status || item.status === GoalStatus.NOT_STARTED) && {
        "bg-bgs2 border-brs3": true,
        "group-hover:bg-aps2 group-hover:border-aps1 group-hover:text-aps1":
          item.label
      },
      {
        "bg-aps2 border-aps1 text-b2":
          item.status === GoalStatus.IN_PROGRESS ||
          item.status === GoalStatus.COMPLETED,
        "border-dashed": item.status === GoalStatus.IN_PROGRESS
      }
    )}
    use:hoverable={{
      onHover: (val) => {
        isHovering = val;
      }
    }}
  >
    {#if isHovering}
      <Icon
        icon="ph:dots-six-vertical"
        class={cn({
          "text-aps1": accessPoint !== ResourceAccessPoint.FORM,
          "text-fgs3": accessPoint === ResourceAccessPoint.FORM
        })}
        size={Size.sm}
      />
    {:else if item.status === GoalStatus.COMPLETED}
      <Icon icon={statusIcon} class="text-aps1" size={Size.sm} />
    {:else if item.status === GoalStatus.IN_PROGRESS}
      <Icon icon={statusIcon} class="text-aps1" size={Size.sm} />
    {:else if item.type === "add"}
      <Icon icon="ph:plus-light" class="text-fgs3" size={Size.sm} />
    {:else}
      {index + 1}
    {/if}
  </div>
  {#if index !== totalLength - 1}
    <div
      class={cn("w-0.25 h-12 border-l absolute top-8 left-4 -translate-x-1/2", {
        "border-brs3": !item.status || item.status === GoalStatus.NOT_STARTED,
        "border-dashed": item.status !== GoalStatus.COMPLETED,
        "border-aps1":
          item.status === GoalStatus.IN_PROGRESS ||
          item.status === GoalStatus.COMPLETED
      })}
    />
  {/if}
</div>
