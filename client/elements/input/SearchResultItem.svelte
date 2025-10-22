<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";

  export let label: string;
  export let isActive: boolean = false;
  let itemRef: HTMLButtonElement;
  $: if (isActive && itemRef)
    itemRef.scrollIntoView({ behavior: "smooth", block: "end" });
</script>

<button
  bind:this={itemRef}
  on:click
  class={cn("p-2 w-full hover:bg-bgs2-striped flex items-start", {
    "bg-bgs2 font-medium": isActive,
    "min-h-[2.5rem] h-10": !$$slots.default
  })}
>
  <slot>
    <span class="truncate">
      {label}
    </span>
  </slot>
</button>
