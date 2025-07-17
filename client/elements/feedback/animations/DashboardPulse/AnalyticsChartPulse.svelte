<script lang="ts">
  export let variant: "bar" | "pie" | "mixed" = "bar";
</script>

<div class="animate-pulse w-full h-full p-4">
  {#if variant === "bar"}
    <div class="flex items-end justify-between h-full gap-2">
      <div class="bg-bgs2 rounded-t-sm w-full h-[60%]"></div>
      <div class="bg-bgs2 rounded-t-sm w-full h-[80%]"></div>
      <div class="bg-bgs2 rounded-t-sm w-full h-[45%]"></div>
      <div class="bg-bgs2 rounded-t-sm w-full h-[90%]"></div>
      <div class="bg-bgs2 rounded-t-sm w-full h-[70%]"></div>
      <div class="bg-bgs2 rounded-t-sm w-full h-[55%]"></div>
    </div>
  {:else if variant === "pie"}
    <div class="flex items-center justify-center h-full">
      <div class="relative w-24 h-24">
        <div class="absolute inset-0 bg-bgs2 rounded-full"></div>
        <div class="absolute inset-2 bg-bgs1 rounded-full"></div>
      </div>
    </div>
  {:else}
    <div class="grid grid-cols-2 gap-4 h-full">
      <div class="flex items-end justify-between gap-1">
        <div class="bg-bgs2 rounded-t-sm w-full h-[50%]"></div>
        <div class="bg-bgs2 rounded-t-sm w-full h-[70%]"></div>
        <div class="bg-bgs2 rounded-t-sm w-full h-[40%]"></div>
        <div class="bg-bgs2 rounded-t-sm w-full h-[85%]"></div>
      </div>
      <div class="flex items-center justify-center">
        <div class="relative w-16 h-16">
          <div class="absolute inset-0 bg-bgs2 rounded-full"></div>
          <div class="absolute inset-2 bg-bgs1 rounded-full"></div>
        </div>
      </div>
    </div>
  {/if}
</div>
