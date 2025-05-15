<script lang="ts">
  import ExternalLogo from "$lib/client/branding/external/ExternalLogo.svelte";
  import type { IContemporary } from "$lib/client/types/featureWheel.type";
  export let contemporary: IContemporary;
</script>

<th class="border border-bgs3 p-2 text-left">
  <div class="flex items-center gap-1">
    <ExternalLogo provider={contemporary} />
    <span class="font-light">{contemporary.label}</span>
  </div>
</th>
