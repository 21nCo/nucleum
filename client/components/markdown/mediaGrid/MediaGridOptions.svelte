<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import { Size } from "@21n/types/size.enum";
  import { PanelSwitcherStyle } from "@21n/types/switcher.enum";
  import UploadButton from "@21n/elements/button/UploadButton.svelte";
  import Slider from "@21n/elements/slider/Slider.svelte";
  import { createEventDispatcher } from "svelte";
  import { MediaGridType } from "@21n/products/memotron/node/node.type";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import Button from "@21n/elements/button/Button.svelte";
  import InlineFeedbackText from "@21n/extensions/clipper/InlineFeedbackText.svelte";
  import { AlertType } from "@21n/types/notification.type";

  export let config: any;
  export let handleFileUpload;
  export let sortItems;
  export let chevUp;
  export let chevDown;
  export let handleNewImageLoad;
  export let columnArray;
  export let isUploadInProgress;
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

<div class="h-10 w-full bg-bgs1 flex items-center gap-4 px-4 py-1">
  <PanelSwitcher
    parentBgIndex={2}
    items={[
      {
        value: MediaGridType.AUTO,
        label: "Auto"
      },
      {
        value: MediaGridType.COLUMNS,
        label: "Columns"
      }
    ]}
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
    type={ButtonVariant.SECONDARY}
    size={Size.sm}
    accept="image/*,audio/*,video/*,application/pdf"
  />
  <div>
    {#if isUploadInProgress}
      <InlineFeedbackText
        feedback={{
          type: AlertType.PROGRESS,
          message: "Uploading..."
        }}
      />
    {/if}
  </div>
  {#if config.isHovered}
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

    {#if config.type === MediaGridType.COLUMNS}
      <div
        class="inline-flex gap-1 w-20 h-7 px-2 bg-bgs2 rounded-full text-b3 text-fgs2"
      >
        <div class="flex items-center justify-center px-1">
          {config.noOfColumns}
        </div>
        <div class="inline-flex flex-col">
          <Icon icon="chevron-up" size={Size.xs} on:click={chevUp} />
          <Icon icon="chevron-down" size={Size.xs} on:click={chevDown} />
        </div>
        <div class="h-full border border-r-brs3"></div>
        <Icon
          icon="plus"
          on:click={() => {
            if (columnArray.length == config.noOfColumns)
              config.noOfColumns += 1;
            else alert("Not more than one empty column can be added");
          }}
        />
      </div>
    {/if}

    <div class="relative ml-auto flex items-center gap-3">
      <!-- <button
      class="material-symbols-rounded"
      on:click={() => {
        config.gridWidth = config.isWideLayout
          ? config.gridWidth / 1.3
          : config.gridWidth * 1.3;
        if (config.type == MediaGridType.AUTO)
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
    > -->

      <!-- <Button
              icon="text"
      on:click={() => (isAltTextEnabled = !isAltTextEnabled)}
    />
    {#if isAltTextEnabled}
      <div
        class="absolute bottom-[150%] -left-[150px] w-[301px] h-[198px] bg-bgs1 rounded-lg border border-brs3 px-3 py-2 shadow-lg"
      >
        <h3 class="text-start font-medium">Alt Text</h3>
        <textarea
          placeholder="E.g. A diverse art gallery featuring various artworks."
          bind:value={config.altText}
          on:keydown={checkTextLimit}
          class="bg-bgs1 border border-bgs4 text-sm w-[277px] h-[120px] resize-none"
        />

        <div class="text-end text-xs text-fgs3">
          {config.altText.length} / {maxLength}
        </div>
      </div>
    {/if} -->
      <button
        class="relative flex items-center"
        on:click={() => (isGapSliderEnabled = !isGapSliderEnabled)}
      >
        {#if isGapSliderEnabled}
          <div
            class="absolute bottom-[150%] -left-[3rem] w-32 h-12 bg-bgs1 rounded-lg border border-bgs4 shadow-lg pt-1"
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
        <Icon icon="sliders-horizontal" />
      </button>
      <Button
        icon="trash"
        tooltip="Delete"
        type={ButtonVariant.DANGER}
        style={ButtonStyle.OUTLINED}
        size={Size.sm}
        on:click={() => dispatch("delete")}
      />
    </div>
  {/if}
</div>
