<script lang="ts">
  import ExternalLogo from "$lib/client/branding/external/ExternalLogo.svelte";

  export let label: string;
  export let provider: string;
</script>

<th class="border border-bgs3 p-2 text-left">
  <div class="flex items-center gap-1">
    <ExternalLogo {provider} />
    <span class="font-light">{label}</span>
  </div>
</th>
