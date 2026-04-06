<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import { GoalStatus } from "@21n/components/goals/goal.type";
  import GoalStatusSwitcherItem from "@21n/components/goals/status/GoalStatusSwitcherItem.svelte";

  let {
    status = $bindable(GoalStatus.NOT_STARTED),
    variant = "spread",
    onChange = undefined
  }: {
    status?: GoalStatus;
    variant?: "spread" | "dropdown";
    onChange?: ((event: CustomEvent<GoalStatus>) => void) | undefined;
  } = $props();
  function emitChange(nextStatus: GoalStatus) {
    const changeEvent = new CustomEvent<GoalStatus>("change", {
      detail: nextStatus
    });
    onChange?.(changeEvent);
  }
</script>

{#if variant === "spread"}
  <div class="flex justify-between relative">
    <div
      class={cn("absolute top-1/2 left-0 right-0 border-t z-10", {
        "border-fgs4 border-dashed": status !== GoalStatus.COMPLETED,
        "border-ccs1 border-2": status === GoalStatus.COMPLETED
      })}
    />
    {#if status === GoalStatus.IN_PROGRESS}
      <div
        class={cn(
          "absolute top-1/2 left-0 w-1/2 border-2 border-t border-ccs1 z-10"
        )}
      />
    {/if}
    {#each Object.values(GoalStatus) as item}
      <GoalStatusSwitcherItem
        status={item}
        isActive={status === item}
        isAccent={status === GoalStatus.COMPLETED ||
          (status === GoalStatus.IN_PROGRESS &&
            item === GoalStatus.NOT_STARTED)}
        onClick={() => {
          status = item;
          emitChange(status);
        }}
      />
    {/each}
  </div>
{/if}
