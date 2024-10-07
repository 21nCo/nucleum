<script lang="ts">
  import { onMount } from "svelte";
  import type { INode } from "../node.type";
  import WaveSurfer from "wavesurfer.js";
  import { retrieveCurrentColors } from "$lib/client/utils/theme.utils";
  import appearance from "$lib/client/stores/appearance.store";

  export let node: INode;
  const currentColors: any = retrieveCurrentColors($appearance);
  const generator = randomLowercaseStringGenerator(15);
  const id = generator.next().value + "audioPreview";
  onMount(() => {
    renderAudioPreview();
  });

  function renderAudioPreview() {
    if (!node.file?.url) return;
    try {
      const wavesurfer = WaveSurfer.create({
        container: `#${id}`,
        waveColor: currentColors["aps1"],
        progressColor: currentColors["aps1"],
        cursorColor: currentColors["aps1"],
        url: node.file?.url
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
