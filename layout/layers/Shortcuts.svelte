<script lang="ts">
  import { modalEvent } from "$lib/tidy/stores/app.store";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import { onDestroy } from "svelte";

  const shortcutListener = (event: any) => {
    if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      modalEvent.notify({
        isShow: true,
        path: "cmd",
        isHideTitleIfEmpty: true,
        layoutParams: {
          size: Size.lg,
          orientation: Orientation.Horizontal,
          ignoreSafeArea: true
        }
      });
    }
  };
  window?.addEventListener("keydown", shortcutListener);
  onDestroy(() => {
    window?.removeEventListener("keydown", shortcutListener);
  });
</script>
