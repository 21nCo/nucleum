<script lang="ts">
  import ExternalLogo from "$lib/client/branding/external/ExternalLogo.svelte";
  export let icon: string | undefined = undefined;
  export let url: string | undefined = undefined;
  export let width: number;
</script>

<ExternalLogo
  provider={icon}
  {url}
  {width}
  class="border-[0.5px] border-brs3 rounded-full"
/>
