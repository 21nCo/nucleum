<script lang="ts">
  import ExternalLogo from "$lib/tidy/branding/external/ExternalLogo.svelte";
  export let label: string;
</script>

<ExternalLogo provider={label.toLowerCase()} width={12} />
