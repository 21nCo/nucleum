<script lang="ts">
  export let title: string;
  export let subtitle: string | undefined = undefined;
</script>

<div class="flex flex-col gap-3 items-center">
  <p class="text-4xl font-medium">{title}</p>
  {#if subtitle}
    <p class="text-base">{subtitle}</p>
  {/if}
</div>
