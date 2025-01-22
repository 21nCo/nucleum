<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";

  export let href: string;
  export let label: string;
</script>

<a
  class="inline-link text-aps1 underline hover:bg-aps3 px-0.5 rounded-md cursor-pointer"
  data-label={label}
  {href}
  on:click={() => appStore.openLink(href)}
>
  {label ?? href}
</a>
