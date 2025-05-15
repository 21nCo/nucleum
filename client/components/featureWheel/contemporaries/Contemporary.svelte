<script lang="ts">
  import ExternalLogo from "$lib/client/branding/external/ExternalLogo.svelte";
  import type { IFeatureWheelContemporary } from "$lib/client/types/featureWheel.type";
  export let contemporary: IFeatureWheelContemporary;
  export let width: number;
</script>

<ExternalLogo
  provider={contemporary}
  {width}
  class="border-[0.5px] border-brs3 rounded-full"
/>
