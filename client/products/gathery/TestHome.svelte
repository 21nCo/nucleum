<script>
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  let feature = "This feature is coming soon!";
  onMount(() => {
    const pageSub = page.subscribe((x) => {
      feature = x.params?.route;
    });
    return () => {
      pageSub();
    };
  });
</script>

<div class="w-full h-full flex justify-center items-center">
  <!-- {defaultAppData.name} -->
  <ComingSoonView mainText={feature} subText="coming soon..." />
</div>
