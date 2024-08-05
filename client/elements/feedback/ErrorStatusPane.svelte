<script lang="ts">
  import SomethingWentWrongIllustration from "$lib/client/illustrations/SomethingWentWrongIllustration.svelte";

  export let error: string | undefined = undefined;
</script>

<div class="flex flex-col gap-6 justify-center items-center w-full h-full">
  <div class="w-32 h-32">
    <SomethingWentWrongIllustration />
  </div>
  <div class="flex flex-col gap-1 items-center">
    <div>Something went wrong.</div>
    <div class="text-b3 text-fgs3">
      {error}
    </div>
  </div>
</div>
