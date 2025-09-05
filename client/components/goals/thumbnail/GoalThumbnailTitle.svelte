<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import RecordStarStatusFeedback from "../../record/RecordStarStatusFeedback.svelte";
  import { GoalStatus, type IGoalThumb } from "../goal.type";
  import { resolveGoalTypeIcon } from "../goal.utils";
  export let item: IGoalThumb;
  export let isCurrentlyFocusing: boolean = false;
  export let color: number | undefined = undefined;
</script>

<div class="flex items-center gap-1.5 userdata">
  {#if item.status === GoalStatus.COMPLETED}
    <Icon icon="check-circle" class="text-ccs1" isFilled={true} />
  {:else}
    <Icon
      icon={resolveGoalTypeIcon(item.type)}
      class={cn({
        "text-ccs1": color
      })}
    />
  {/if}
  <div class="flex flex-col gap-1 flex-grow">
    <div class="flex items-center gap-2">
      <span
        class={cn("text-b2 truncate", {
          "text-ccs1": isCurrentlyFocusing
        })}>{item.label ? item.label : "Untitled"}</span
      >
      <RecordStarStatusFeedback isStarred={item.isStarred} />
    </div>
  </div>
</div>
