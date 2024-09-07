<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  let className: string = "";
  export { className as class };
</script>

<button on:click class={cn("w-2 h-2 rounded-full", className)}></button>
