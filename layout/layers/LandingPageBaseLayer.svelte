<script lang="ts">
  import { onMount } from "svelte";
  import ThemeLayer from "./ThemeLayer.svelte";
  import { Persistance } from "$lib/tidy/stores/persistance";
  import { appStore } from "$lib/tidy/stores/app.store";
  onMount(async () => {
    await initializeAppData();
  });
  async function initializeAppData() {
    const app = import.meta.env.VITE_APP ?? window.location.hostname;
    if (!app) return;
    await new Persistance().initializeAppData(app);
  }
</script>

<title>{$appStore.appData.name ?? ""}</title>
<div class="flex h-screen w-screen">
  <ThemeLayer>
    <slot />
  </ThemeLayer>
</div>
