<script lang="ts">
  import { onMount } from "svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
  import { appEvents } from "$lib/client/stores/notification.store";
  import type { IEvent } from "$lib/client/types/event.type";
  import { PointronEvent } from "$lib/client/types/pointron/pointronEvent.enum";
  import { postNotificationToParent } from "$lib/client/utils/embed.utils";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import context from "$lib/client/stores/context.store";

  let src: string | null = null;
  let body: string = "";
  let audio: any;

  onMount(() => {
    const pointronEventSub = appEvents.subscribe((event: IEvent) => {
      src = null;
      switch (event.event) {
        case PointronEvent.BREAK_ENDED:
          src = $pointronPreferences.breakEndSound ?? "/sounds/ping.wav";
          appStore.runAction(
            PointronAction.PREDEFINED_INTERVAL_NOTIFIER_OVERLAY
          );
          body = "Break ended";
          break;
        case PointronEvent.INTERVAL_ENDED:
          src = $pointronPreferences.focusEndSound ?? "/sounds/ping.wav";
          appStore.runAction(
            PointronAction.PREDEFINED_INTERVAL_NOTIFIER_OVERLAY
          );
          body = "Interval ended";
          break;
        case PointronEvent.BREAK_REMINDER:
          src = $pointronPreferences.focusEndSound ?? "/sounds/ping.wav";
          body = "Interval time limit reached";
          appStore.runAction(PointronEvent.BREAK_REMINDER);
          break;
        // case PointronEventEnum.PREDEFINED_INTERVAL_NOTIFIER:
        //   runAction(PointronEventEnum.PREDEFINED_INTERVAL_NOTIFIER);
        //   break;
        case PointronEvent.SESSION_FINISHED:
          src =
            $pointronPreferences.sessionFinishSound ?? "/sounds/dingding.mp3";
          appStore.runAction(PointronEvent.SESSION_FINISHED);
          break;
        case PointronEvent.SESSION_TIME_IS_UP:
          src =
            $pointronPreferences.sessionFinishSound ?? "/sounds/dingding.mp3";
          body = "Session finished";
          break;
      }
      if (!src) return;
      try {
        setTimeout(() => {
          // const notification = new Notification("Pointron session", {
          //   body,
          //   icon: "",
          // });
          postNotificationToParent({
            message: "",
            sound: src ? src.split("/sounds/")[1] : ""
          });
          if (!$context.isEmbed) {
            console.log({ context: "playing sound", event, src });
            audio?.play();
          }
          setTimeout(() => {
            src = null;
            appEvents.reset();
          }, 2000);
        }, 200);
      } catch (e) {
        console.error("Error in playing sound - Notifications", e);
      }
    });
    return () => {
      pointronEventSub();
    };
  });
</script>

<audio bind:this={audio} {src} />
