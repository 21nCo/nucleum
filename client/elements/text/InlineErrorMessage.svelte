<script lang="ts">
  let {
    error = $bindable(null),
    isDissappear = true
  }: {
    error?: string | null;
    isDissappear?: boolean;
  } = $props();
  let timer: ReturnType<typeof setTimeout> | undefined = undefined;
  $effect(() => {
    if (!error || !isDissappear) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      error = null;
    }, 4000);
    return () => clearTimeout(timer);
  });
</script>

<div class="h-6 w-full flex justify-center">
  {#if error}
    <div class="text-ars1 text-b2">
      {error}
    </div>
  {/if}
</div>
