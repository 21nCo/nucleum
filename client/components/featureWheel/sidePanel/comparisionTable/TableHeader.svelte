<script lang="ts">
  import ExternalLogo from "$lib/client/branding/external/ExternalLogo.svelte";
  import type { IContemporary } from "$lib/client/types/featureWheel.type";
  export let contemporary: IContemporary;
</script>

<th class="border border-bgs3 p-2 text-left">
  <div class="flex items-center gap-1">
    <div class="w-5 h-5">
      <ExternalLogo provider={contemporary} url={contemporary.url} />
    </div>
    <span class="font-medium">{contemporary.label}</span>
  </div>
</th>
