<script lang="ts">
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import type { IGoalThumb } from "../goal.type";
  export let item: IGoalThumb;
</script>

<div class="flex gap-1 items-center">
  {#if item.children && item.children.length > 0}
    <Badge
      text={`${item.children.length} sub ${item.children.length === 1 ? "goal" : "goals"}`}
    />
  {/if}
  <Badge text={item.status ? enumToString(item.status) : "Not started"} />
</div>
