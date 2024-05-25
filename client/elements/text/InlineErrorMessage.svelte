<script lang="ts">
  export let error: string | null = null;
  let timer: any;
  $: if (error) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      error = null;
    }, 4000);
  }
</script>

<div class="h-6 w-full flex justify-center">
  {#if error}
    <div class="text-ars1 text-b3">
      {error}
    </div>
  {/if}
</div>
