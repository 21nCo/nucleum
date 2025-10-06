<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  export let isExtraSmall: boolean = false;
  export let isDynamicSize: boolean = false;
  let classList: string = "";
  export { classList as class };
</script>

<div
  class={cn(classList, {
    "p-2 lg:p-4": isExtraSmall,
    "px-3 tp:px-8 lg:px-12": !isExtraSmall,
    "w-full": !isDynamicSize
  })}
>
  <slot />
</div>
