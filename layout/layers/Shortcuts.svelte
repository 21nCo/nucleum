<script lang="ts">
  import { modalEvent } from "$lib/tidy/stores/app.store";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import { runAction } from "$lib/tidy/utils/utils";
  import { onDestroy } from "svelte";

  const shortcutListener = (event: any) => {
    if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      runAction(AppEvent.CMD);
    } else if (event.key === "e" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      runAction(AppEvent.EDIT_MODE);
    } else if (event.key === "Escape") {
      modalEvent.hide();
    }
  };
  window?.addEventListener("keydown", shortcutListener);
  onDestroy(() => {
    window?.removeEventListener("keydown", shortcutListener);
  });
</script>
