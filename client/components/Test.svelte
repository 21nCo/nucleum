<script lang="ts">
  import { onMount } from "svelte";
  import { fullPageLoadingScreen } from "@21n/stores/notification.store";

  onMount(() => {
    fullPageLoadingScreen.show("Finishing session...");
  });
</script>
