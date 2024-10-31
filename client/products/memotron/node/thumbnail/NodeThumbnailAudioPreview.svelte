<script lang="ts">
  import WaveSurfer from "wavesurfer.js";
  import { retrieveCurrentColors } from "$lib/client/utils/theme.utils";
  import appearance from "$lib/client/stores/appearance.store";

  export let resolveUrl: undefined | (() => Promise<string>) = undefined;
  export let url: string = "";
  if (resolveUrl) {
    resolveUrl().then((u) => {
      url = u;
      renderAudioPreview();
    });
  } else if (url) {
    renderAudioPreview();
  }

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
</script>

<div class="w-full h-full flex justify-center items-center">
  <div {id} class="w-full" />
</div>
