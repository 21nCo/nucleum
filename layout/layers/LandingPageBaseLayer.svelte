<script lang="ts">
  import { onMount } from "svelte";
  import ThemeLayer from "./ThemeLayer.svelte";
  import { Persistance } from "$lib/tidy/stores/persistance";
  onMount(async () => {
    await initializeAppData();
  });
  async function initializeAppData() {
    const app = import.meta.env.VITE_APP ?? window.location.hostname;
    if (!app) return;
    await new Persistance().initializeAppData(app);
  }
</script>

<ThemeLayer>
  <slot />
</ThemeLayer>
