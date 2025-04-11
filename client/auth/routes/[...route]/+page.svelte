<script lang="ts">
  import { page } from "$app/stores";

  let product = $page?.params?.route;
</script>

<div>
  {product}
</div>
