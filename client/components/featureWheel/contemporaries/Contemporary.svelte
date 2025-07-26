<script lang="ts">
  import ExternalLogo from "$lib/client/branding/external/ExternalLogo.svelte";
  export let icon: string;
  export let width: number;
</script>

<ExternalLogo
  provider={icon}
  {width}
  class="border-[0.5px] border-brs3 rounded-full"
/>
