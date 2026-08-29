<script lang="ts">
  import { tooltip } from "@21n/actions/popover.action";
  import { isValidString } from "@21n/shared-utils/text.utils";
  import type { IObjectiveThumb } from "@21n/components/goals/goal.type";

  let { item }: { item: IObjectiveThumb } = $props();
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
