<script lang="ts">
  import { isValidString } from "$lib/shared/utils/text.utils";
  import type { IGoalThumb } from "./goal.type";
  export let item: IGoalThumb;
</script>

<div>
  <span class="text-left truncate userdata">
    {isValidString(item.label) ? item.label : "Untitled"}
  </span>
</div>
