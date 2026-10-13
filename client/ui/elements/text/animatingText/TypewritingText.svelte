<script lang="ts">
  // @ts-nocheck
  import { onMount } from "svelte";
    let {
    text,
  }: {
    text: string;
  } = $props();

  let visible = true;
  let timer: any;

  onMount(() => {
    timer = setInterval(() => {
      visible = !visible;
    }, 2500);
    return () => {
      clearInterval(timer);
    };
  });
  function typewriter(node, { speed = 1 }) {
    const valid =
      node.childNodes.length === 1 &&
      node.childNodes[0].nodeType === Node.TEXT_NODE;
    if (!valid) {
      return;
    }
    const text = node.textContent;
    const duration = text.length / (speed * 0.005);
    return {
      duration,
      tick: (t) => {
        const i = Math.trunc(text.length * t);
        node.textContent = text.slice(0, i);
      }
    };
  }
</script>

<div class="w-full h-full flex justify-center items-center">
  {#if visible}
    <div in:typewriter out:typewriter>{text}</div>
  {/if}
</div>
