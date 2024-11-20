<script lang="ts">
  import { Rive } from "@rive-app/canvas";
  import { onMount } from "svelte";
  export let icon: string;
  let trigger: any;
  onMount(() => {
    const r = new Rive({
      src: icon + ".riv",
      canvas: document.getElementById("canvas") as HTMLCanvasElement,
      autoplay: true,
      stateMachines: "sm",
      onLoad: () => {
        r.resizeDrawingSurfaceToCanvas();
        // Get the inputs via the name of the state machine
        const inputs = r.stateMachineInputs("sm");
        // Find the input you want to set a value for, or trigger
        trigger = inputs.find((i) => i.name === "press");
      }
    });
  });
  export function fire() {
    setTimeout(() => {
      trigger?.fire();
    }, 100);
  }
</script>

<canvas id="canvas" width="10" height="10" />
