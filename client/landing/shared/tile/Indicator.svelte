<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  let { onclick }: { onclick?: () => void } = $props();
  let className: string = "";
  export { className as class };
</script>

<button type="button" {onclick} class={cn("w-2 h-2 rounded-full", className)}></button>
