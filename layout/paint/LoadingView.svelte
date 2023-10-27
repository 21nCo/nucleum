<!-- FILEPATH: /Users/ar/dev/devving/Tidigit/pointron/src/lib/tidy/layout/paint/LoadingView.svelte -->

<script lang="ts">
  export let message: string = "booting up...";
</script>

<div class="flex flex-col items-center justify-center h-screen w-screen">
  <div class="text-fgs3">
    {message}
  </div>
</div>
