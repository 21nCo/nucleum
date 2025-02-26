<script lang="ts">
  import type { IGoalThumb } from "./goal.type";
  export let item: IGoalThumb;
</script>

<div>
  <span class="text-left truncate userdata">
    {item.label}
  </span>
</div>
