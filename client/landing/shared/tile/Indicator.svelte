<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  let className: string = "";
  export { className as class };
</script>

<button on:click class={cn("w-2 h-2 rounded-full", className)}></button>
