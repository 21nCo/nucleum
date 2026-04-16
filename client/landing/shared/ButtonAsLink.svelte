<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  let {
    label,
    onclick
  }: {
    label: string;
    onclick?: () => void;
  } = $props();
  let className: string = "";
  export { className as class };
</script>

<button
  type="button"
  class={cn("max-w-fit p-0", className)}
  onclick={onclick}
>
  <p
    class="text-[16px] font-medium text-center border-b border-fgs3 border-dashed hover:text-aps1"
  >
    {label}
  </p>
</button>
