<script lang="ts">
  import { tooltip } from "$lib/client/actions/popover.action";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import type { IGoalThumb } from "./goal.type";
  export let item: IGoalThumb;
</script>

<div class="flex items-center gap-2 min-w-0">
  <span
    class="text-left truncate userdata"
    use:tooltip={{
      text: item.label,
      isEnableOnlyOnTruncate: true
    }}
  >
    {isValidString(item.label) ? item.label : "Untitled"}
  </span>
</div>
