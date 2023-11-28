<script lang="ts">
  export let error: string | null = null;
  let timer: any;
  $: if (error) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      error = null;
    }, 3000);
  }
</script>

<div class="h-4">
  {#if error}
    <div class="text-ar">{error}</div>
  {/if}
</div>
