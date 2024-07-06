<script lang="ts">
  import { backgroundSoundStore } from "$lib/client/products/pointron/pointron.store";
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { BlockType } from "$lib/client/types/pointron/session.type";
  import { isValidString } from "$lib/client/utils/text.utils";
  import { onMount } from "svelte";
  let audioRef: HTMLAudioElement;
  let src: string | undefined = undefined;
  onMount(() => {
    // audioRef.volume = 0.1;
    //if ($backgroundSoundStore) audioRef.play();
    const bgSoundSub = backgroundSoundStore.subscribe((sound) => {
      if (
        sound.systemSound?.toLowerCase() === "none" ||
        !isValidString(sound.systemSound)
      ) {
        stopAudio();
        return;
      } else {
        src = `/sounds/${sound.systemSound?.toLowerCase()}.mp3`;
        playIfSoundFileExists();
      }
    });
    const sessionStoreSub = sessionStore.subscribe((x) => {
      if (
        !x?.isSessionRunning ||
        (x?.isSessionRunning && x?.currentBlock.type != BlockType.FOCUS)
      ) {
        stopAudio();
      } else if ($backgroundSoundStore?.systemSound != "none" && src) {
        playIfSoundFileExists();
      }
    });
    return () => {
      audioRef?.pause();
      bgSoundSub();
      sessionStoreSub();
    };
  });

  async function playIfSoundFileExists() {
    if (!src) return;
    const response = await fetch(src);
    if (response.status === 200) audioRef?.play();
    else {
      stopAudio();
    }
  }
  function stopAudio() {
    src = undefined;
    audioRef?.pause();
  }
</script>

<audio bind:this={audioRef} {src} loop />
