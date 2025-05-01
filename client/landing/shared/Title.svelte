<script lang="ts">
  export let title: string;
  export let subtitle: string | undefined = undefined;
</script>

<div class="flex flex-col gap-3 items-center">
  <p class="mo:text-h1 text-[44px] font-medium text-center">{title}</p>
  {#if subtitle}
    <p class="text-base mo:text-b2 text-center">{subtitle}</p>
  {/if}
</div>
