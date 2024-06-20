<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import UploadButton from "$lib/client/elements/button/UploadButton.svelte";
  import Slider from "$lib/client/elements/slider/Slider.svelte";
  import { createEventDispatcher } from "svelte";

  export let config: any;
  export let handleFileUpload;
  export let sortItems;
  export let chevUp;
  export let chevDown;
  export let handleNewImageLoad;
  export let columnArray;
  let maxLength = 500;

  let isGapSliderEnabled: Boolean = false;
  let isAltTextEnabled: boolean = false;
  const dispatch = createEventDispatcher();
  function checkTextLimit(e: any) {
    if (e.key == "Backspace") {
      return;
    } else if (config.altText.length == maxLength) {
      e.preventDefault();
    }
  }
</script>

<div
  class="absolute h-[110px] bottom-6 flex -m-2"
  style="width: {config.gridWidth}px;"
>
  <div
    class="mx-auto h-full bg-bgs1 rounded-lg border border-bgs4 shadow-lg py-2 px-3"
    style="width: {config.gridWidth - 20}px;"
  >
    <div
      class="h-[43px] w-full flex justify-center items-center p-3 bg-bgs2 rounded-lg border-2 border-bgs4 border-dashed"
    >
      <span>
        <Icon icon="copy" size={Size.sm} />Drag files to grid or use the Upload
      </span>
    </div>
    <div class="h-auto bg-bgs1 flex items-center gap-4 px-4 pt-2">
      <PanelSwitcher
        parentBackgroundIndex={2}
        items={["AUTO", "COLUMNS"]}
        value={config.type}
        style={PanelSwitcherStyle.TRAIN}
        size={Size.sm}
        on:switch={(e) => {
          sortItems(e.detail);
          config.type = e.detail;
        }}
      />
      <UploadButton
        on:input={handleFileUpload}
        size={Size.sm}
        accept="image/*,audio/*,video/*,application/pdf"
      />

      <!-- <input
            type="text"
            placeholder="Type URL"
            on:focus={() => (typeURLFocused = true)}
            on:blur={() => (typeURLFocused = false)}
            on:keydown={handleKeyDown}
            class="{typeURLFocused
              ? 'w-48'
              : 'w-24'}  border border-fgs1 rounded-full bg-aps1 text-bgs1 text-b2 placeholder-bgs1 p-2 z-10"
          /> -->

      {#if config.type === "COLUMNS"}
        <div
          class="inline-flex gap-0.5 w-16 h-6 px-2 bg-bgs3 rounded-xl text-sm text-fgs2"
        >
          <div class="py-0.5">{config.noOfColumns}</div>
          <div class="inline-flex flex-col ml-auto">
            <Icon icon="chevup" size={Size.xs} on:click={chevUp} />
            <Icon icon="chevdown" size={Size.xs} on:click={chevDown} />
          </div>
          <div class="h-full border border-r-fgs4"></div>
          <button
            class="material-symbols-rounded"
            on:click={() => {
              if (columnArray.length == config.noOfColumns)
                config.noOfColumns += 1;
              else alert("Not more than one empty column can be added");
            }}
          >
            {@html "&#Xe145"}</button
          >
        </div>
      {/if}

      <div class="relative ml-auto flex items-center gap-3">
        <button
          class="material-symbols-rounded"
          on:click={() => {
            config.gridWidth = config.isWideLayout
              ? config.gridWidth / 1.3
              : config.gridWidth * 1.3;
            if (config.type == "AUTO")
              /**
               * setTimeout is to set a delay for all images to load and scrollHeight to form.
               */
              setTimeout(() => handleNewImageLoad(), 1);
            config.isWideLayout = !config.isWideLayout;
          }}
        >
          {#if config.isWideLayout}
            {@html "&#Xf507"}
          {:else}
            {@html "&#Xf830"}
          {/if}</button
        >

        <Icon
          icon="alt-text"
          class="relative"
          on:click={() => (isAltTextEnabled = !isAltTextEnabled)}
        />
        {#if isAltTextEnabled}
          <div
            class="absolute bottom-[150%] -left-[150px] w-[301px] h-[198px] bg-bgs1 rounded-lg border border-bgs4 px-3 py-2 shadow-lg"
            on:click|stopPropagation
            on:keydown={() => {}}
          >
            <h3 class="text-start font-medium">Alt Text</h3>
            <textarea
              placeholder="E.g. A diverse art gallery featuring various artworks."
              bind:value={config.altText}
              on:keydown={checkTextLimit}
              class="border border-bgs4 text-sm w-[277px] h-[120px] resize-none"
            />

            <div class="text-end text-xs text-fgs3">
              {config.altText.length} / {maxLength}
            </div>
          </div>
        {/if}
        <button
          class="material-symbols-rounded relative"
          on:click={() => (isGapSliderEnabled = !isGapSliderEnabled)}
        >
          {#if isGapSliderEnabled}
            <div
              class="absolute bottom-[150%] -left-[3rem] w-28 h-12 bg-bgs1 rounded-lg border border-bgs4 shadow-lg pt-1"
            >
              <div class="font-sans text-sm w-full">
                <!--The +4px accounts to the invisible border added to draggable elements for feedback animation -->
                {config.gap + 4}px
              </div>
              <Slider
                bind:value={config.gap}
                on:input={() => {
                  if (config.type == "AUTO") {
                    handleNewImageLoad();
                  }
                  //   else ResizeImageForAllColumns();
                }}
              />
            </div>
          {/if}
          {@html "&#Xe660"}
        </button>
        <button
          class="material-symbols-rounded"
          on:click={() => dispatch("delete")}
        >
          {@html "&#Xe872"}</button
        >
      </div>
    </div>
  </div>
</div>
