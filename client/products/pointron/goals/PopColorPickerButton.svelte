<script lang="ts">
  import ColorSlider from "$lib/client/elements/colorPicker/ColorSlider.svelte";
  import Pop from "$lib/client/elements/Pop.svelte";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { AppEvent } from "$lib/client/types/event.enum";
  import type { AppEventType } from "$lib/client/types/event.type";
  import { ColorType } from "$lib/client/types/appearance.type";
  import { customColorStyle } from "$lib/client/utils/theme.utils";
  import { actIfClickedOutside, generateUID } from "$lib/client/utils/utils";
  import { createEventDispatcher, onMount } from "svelte";
  import appearance from "$lib/client/stores/appearance.store";

  export let hue: number | undefined | null;

  const dispatch = createEventDispatcher();

  export let width = "5.75rem";
  export let height = "2.5rem";

  export let usedColors: number[] = [];

  let isVisible: boolean = false;
  const containerId = generateUID();

  function handleClosePop() {
    isVisible = false;
  }

  onMount(() => {
    const sub = appEvents.subscribe((x: AppEventType) => {
      if (
        x.event === AppEvent.WINDOW_CLICKED &&
        x.value &&
        x.value instanceof PointerEvent
      ) {
        actIfClickedOutside(x.value, containerId, handleClosePop);
      }
    });
    return () => {
      sub();
    };
  });
</script>

<div id={containerId} class="relative">
  <button
    on:click={() => {
      isVisible = !isVisible;
    }}
    style={customColorStyle(
      $appearance,
      [ColorType.Bg, ColorType.Outline],
      "fgs1",
      hue
    ) + `width:${width}; height:${height};`}
    tabindex="0"
    class="border-2 border-bgs2 outline outline-fgs1 rounded-sm"
  />
  <Pop bind:isVisible hideHeader classList="min-w-[250px] md:min-w-[300px]">
    <ColorSlider bind:hue on:change />
    {#if usedColors.length > 0}
      <div class="mt-5">
        <span class="text-fgs1 text-b3">Used colors</span>
        <div class="flex flex-wrap md:grid md:grid-cols-5 gap-1 mt-2">
          <!-- {#each usedColors as color}
            <button
              on:click={() => {
                hue = color;
                dispatch("value-change");
              }}
              class={`w-[3rem] h-[2.25rem] rounded-sm hover:scale-[1.03] transition-transform active:scale-[1.06]`}
            />
          {/each} -->
          {#each usedColors as color}
            <button
              on:click={() => {
                hue = color;
                dispatch("value-change");
              }}
              class={`w-[3rem] h-[2.25rem] rounded-sm hover:scale-[1.03] transition-transform active:scale-[1.06]`}
              style={customColorStyle($appearance, ColorType.Bg, "bgs1", color)}
            />
          {/each}
        </div>
      </div>
    {/if}
  </Pop>
</div>
