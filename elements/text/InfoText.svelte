<script lang="ts">
  import { windowObject } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import type { InfoTextParams } from "$lib/tidy/types/text.type";
  import Icon from "../Icon.svelte";
  export let info: InfoTextParams;
  let isHovered: boolean = false;
  let isClicked: boolean = false;
</script>

<button
  class="relative rounded-full w-4 h-4 flex justify-center items-center text-b3 text-fgs3 cursor-pointer"
  on:mouseenter={() => (isHovered = true)}
  on:mouseleave={() => {
    isHovered = false;
    isClicked = false;
  }}
  on:click={() => {
    if (isClicked || isHovered) {
      isClicked = false;
      isHovered = false;
    } else {
      isClicked = true;
    }
  }}
>
  <Icon icon="info" size={Size.sm} />
  {#if isHovered || isClicked}
    <div
      class="absolute text-left flex flex-col gap-2 text-b2 text-fgs2 bg-bgs3 rounded-md p-4 z-30 min-w-[15rem] {$windowObject.isInPortraitMode
        ? 'top-full'
        : 'left-full'}"
    >
      {info.body}
      {#if info.link}
        <a
          class="text-b4 font-medium text-a1 hover:opacity-80"
          href={info.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {info.linkText ?? "Learn more"}
        </a>
      {/if}
    </div>
  {/if}
</button>
