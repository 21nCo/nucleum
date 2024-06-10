<script lang="ts">
  export let error: string | null = null;
  export let isDissappear: boolean = true;
  let timer: any;
  $: if (error && isDissappear) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      error = null;
    }, 4000);
  }
</script>

<div class="h-6 w-full flex justify-center">
  {#if error}
    <div class="text-ars1 text-b2">
      {error}
    </div>
  {/if}
</div>
