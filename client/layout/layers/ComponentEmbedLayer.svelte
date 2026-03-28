<script lang="ts">
  import NotificationListener from "@21n/elements/listeners/NotificationListener.svelte";
  import { EmbedDataMessage } from "@21n/types/embedMessage.enum";
  import { GlobalEvent } from "@21n/types/event.enum";
  import { postDataToParent } from "@21n/utils/embed.utils";
  import { onMount } from "svelte";
  /**
   * @deprecated
   */
  export let bg: number | undefined = undefined;
  export let isBackNavigable: boolean = false;
  $: bg;

  onMount(() => {
    postDataToParent(
      EmbedDataMessage.ENABLE_GESTURE_NAVIGATION,
      isBackNavigable
    );

    return () => {
      postDataToParent(EmbedDataMessage.ENABLE_GESTURE_NAVIGATION, false);
    };
  });

  function onNav(event: CustomEvent) {
    const path = event.detail.path;
    setTimeout(
      () =>
        postDataToParent(
          EmbedDataMessage.ENABLE_GESTURE_NAVIGATION,
          isBackNavigable
        ),
      200
    );
  }
</script>

<NotificationListener event={[GlobalEvent.NAV]} on:nav={onNav} />
