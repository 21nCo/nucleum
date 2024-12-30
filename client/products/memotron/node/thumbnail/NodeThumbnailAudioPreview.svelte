<script lang="ts">
  import WaveSurfer from "wavesurfer.js";
  import { retrieveCurrentColors } from "$lib/client/utils/theme.utils";
  import appearance from "$lib/client/stores/appearance.store";
  import { onMount } from "svelte";
  import { parseBlob } from "music-metadata";

  export let url: string = "";
  let imageUrl: string | null = null;
  let showWaveform = true;

  onMount(async () => {
    // await tryLoadArtwork();
    await loadArtworkUsingLibrary();
    if (!imageUrl || showWaveform) {
      setTimeout(() => {
        renderAudioPreview();
      }, 1000);
    }
  });

  const currentColors: any = retrieveCurrentColors($appearance);
  const generator = randomLowercaseStringGenerator(15);
  const id = generator.next().value + "audioPreview";

  function renderAudioPreview() {
    if (!url) return;
    try {
      const wavesurfer = WaveSurfer.create({
        container: `#${id}`,
        waveColor: currentColors["aps1"],
        progressColor: currentColors["aps1"],
        cursorColor: currentColors["aps1"],
        url
      });
    } catch (error) {
      console.error(error);
    }
  }

  function* randomLowercaseStringGenerator(length = 10) {
    const alphabet = "abcdefghijklmnopqrstuvwxyz";

    while (true) {
      let result = "";
      for (let i = 0; i < length; i++) {
        result += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      yield result;
    }
  }

  async function tryLoadArtwork() {
    try {
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.src = url;

      await new Promise((resolve) => {
        audio.onloadedmetadata = () => {
          setTimeout(resolve, 100);
        };
        audio.onerror = () => resolve(null);
      });

      if ("mediaSession" in navigator && audio.duration > 0) {
        const response = await fetch(url);
        const blob = await response.blob();
        imageUrl = URL.createObjectURL(blob);
        showWaveform = false; // Hide waveform if we have artwork
      }
    } catch (error) {
      console.error("Error loading artwork:", error);
      showWaveform = true; // Show waveform as fallback
    }
  }

  async function loadArtworkUsingLibrary() {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const metadata = await parseBlob(blob);
      if (metadata?.common?.picture) {
        const imageData = metadata.common.picture[0].data;
        imageUrl = URL.createObjectURL(new Blob([imageData]));
        showWaveform = false;
      }
    } catch (error) {
      console.error("Error loading artwork:", error);
      showWaveform = true;
    }
  }

  import { onDestroy } from "svelte";
  onDestroy(() => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
  });
</script>

<div class="w-full h-full flex justify-center items-center">
  {#if imageUrl && !showWaveform}
    <img
      src={imageUrl}
      alt="Audio artwork"
      class="w-full h-full object-contain"
    />
  {:else}
    <div {id} class="w-full" />
  {/if}
</div>
