<script lang="ts">
  import NotificationListener from "$lib/client/elements/listeners/NotificationListener.svelte";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { setEmbedBg } from "$lib/client/utils/embed.utils";
  export let bg: number | undefined = undefined;

  if (bg) setEmbedBg(bg);

  function onNav(event: CustomEvent) {
    const path = event.detail.path;
    if (bg) setEmbedBg(bg);
    else if (["popover", "tooltip"].includes(path)) setEmbedBg(1);
  }
</script>

<NotificationListener event={[GlobalEvent.NAV]} on:nav={onNav} />
