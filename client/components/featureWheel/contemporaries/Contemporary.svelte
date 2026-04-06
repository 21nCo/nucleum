<script lang="ts">
  import ExternalLogo from "@21n/branding/external/ExternalLogo.svelte";
  let {
    icon = undefined,
    url = undefined,
    width
  }: {
    icon?: string | undefined;
    url?: string | undefined;
    width: number;
  } = $props();
</script>

<ExternalLogo
  provider={icon}
  {url}
  {width}
  class="border-[0.5px] border-brs3 rounded-full"
/>
