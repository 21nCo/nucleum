<script lang="ts">
  import ExternalLogo from "$lib/client/branding/external/ExternalLogo.svelte";
  export let label: string;
  export let width: number;
</script>

<ExternalLogo provider={label.toLowerCase()} {width} />
