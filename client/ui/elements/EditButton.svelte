<script lang="ts">
    let {
    isInEditMode = false,
    onclick = void 0,
  }: {
    isInEditMode?: boolean;
    onclick?: (() => void) | undefined;
  } = $props();

</script>

<button
  onclick={() => {
    isInEditMode = !isInEditMode;
    onclick?.();
  }}
>
  <div
    class="w-6 h-6 rounded-full border-2 {isInEditMode
      ? 'border-dotted'
      : 'border-solid'} border-fgs1"
  />
</button>
