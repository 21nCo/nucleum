<script lang="ts">
  import { onMount } from "svelte";
  import { appStore } from "$lib/client/stores/app.store";
  let isActive: any;
  let isSettingsPageActive: boolean = false;
  onMount(() => {
    let url = window.location.href;
    if (url.includes("/c/control")) isSettingsPageActive = true;
  });
  function onSettingsClicked() {
    isSettingsPageActive = !isSettingsPageActive;
    if (isSettingsPageActive) {
      appStore.toggleTopBar(true);
      appStore.gotoPath("/c/control");
    } else {
      appStore.toggleTopBar(false);
      appStore.gotoPath("/");
    }
  }
</script>

<button
  class={(isActive ? "bg-fgs1" : "border-fgs1") +
    " border-2 rounded-md w-7 h-7"}
  on:click={onSettingsClicked}
/>
