<svelte:options runes={true} />

<script lang="ts">
  import Library from "@nucleum/surfaces/library/Library.svelte";
  import { memotronLibraryResources } from "@nucleum/products/memotron/library/memotron-library";
</script>

<Library resources={memotronLibraryResources} />
