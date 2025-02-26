<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { GoalStatus } from "../goal.type";
  import GoalStatusSwitcherItem from "./GoalStatusSwitcherItem.svelte";
  import { createEventDispatcher } from "svelte";
  export let status: GoalStatus = GoalStatus.NOT_STARTED;
  export let variant: "spread" | "dropdown" = "spread";
  const dispatch = createEventDispatcher();
  $: if (!status) {
    status = GoalStatus.NOT_STARTED;
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
        on:click={() => {
          status = item;
          dispatch("change", status);
        }}
      />
    {/each}
  </div>
{/if}
