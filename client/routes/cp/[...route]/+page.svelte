<script lang="ts">
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  import { page } from "$app/stores";
  const route = $page.params.route;
</script>

<ComponentResolver path={"cp/" + route} />
