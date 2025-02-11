<script lang="ts">
  import type { ITaskThumb } from "../task.type";
  export let item: ITaskThumb;
</script>

<div>
  <span class="text-left truncate userdata">
    {item.label}
  </span>
</div>
