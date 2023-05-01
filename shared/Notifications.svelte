<script lang="ts">
    import { EventType } from "$lib/tidy/types/event.enum";
    import type { CustomEvent } from "$lib/tidy/types/event.type";
    import { onMount } from "svelte";
    import { appEvents, userPreferences } from "../stores/stores";

    let src: string | null = null;
    let audio: any;

    onMount(() => {
        appEvents.subscribe((event: CustomEvent) => {
            switch (event.type) {
                case EventType.BREAK_ENDED:
                    src = $userPreferences.breakEndSound ?? "sounds/ping.wav";
                    break;
                case EventType.INTERVAL_ENDED:
                    src = $userPreferences.focusEndSound ?? "sounds/ping.wav";
                    break;
                case EventType.SESSION_FINISHED:
                    src =
                        $userPreferences.sessionFinishSound ??
                        "sounds/dingding.mp3";
                    break;
            }
            if (src) {
                setTimeout(() => {
                    audio?.play();
                    setTimeout(() => {
                        src = null;
                    }, 500);
                }, 200);
            }
        });
    });
</script>

<audio bind:this={audio} {src} />
