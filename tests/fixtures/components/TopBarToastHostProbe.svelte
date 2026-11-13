<svelte:options runes={true} />

<script lang="ts">
  import { fromStore, type Readable } from "svelte/store";
  let {
    toasts,
    isRaised
  }: {
    toasts: Readable<unknown[]>;
    isRaised: Readable<boolean>;
  } = $props();
  const toastList = fromStore(toasts);
  const raised = fromStore(isRaised);
</script>

{#if toastList.current.length > 0 && !raised.current}
  <div data-testid="top-bar-toasts" aria-live="polite">top bar</div>
{/if}
