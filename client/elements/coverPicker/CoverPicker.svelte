<script lang="ts">
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { Action } from "$lib/client/types/action.enum";
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "$lib/client/types/switcher.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import Button from "../button/Button.svelte";
  import ColorPicker from "../colorPicker/ColorPicker.svelte";
  import PanelSwitcher from "../switcher/PanelSwitcher.svelte";
  import Text from "../text/Text.svelte";
  import { createEventDispatcher, onMount } from "svelte";
  import GradientsSelector from "../colorPicker/gradients/GradientsSelector.svelte";
  import { fileDrop } from "$lib/client/actions/fileDrop.action";
  import Icon from "../Icon.svelte";
  import account from "$lib/client/stores/account.store";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import FileView from "$lib/client/components/files/FileView.svelte";
  import { FileType, type IFile } from "$lib/client/components/files/file.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import Resources from "$lib/client/products/memotron/common/Resources.svelte";
  import ComingSoonView from "../ComingSoonView.svelte";
  import { fileStore } from "$lib/client/components/files/file.store";
  import EmptyStatusView from "../feedback/EmptyStatusView.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import view from "$lib/client/stores/view.store";
  export let orientation: Orientation = Orientation.Vertical;
  const dispatch = createEventDispatcher();

  enum Method {
    COLOR = "color",
    GRADIENT = "gradient",
    LIBRARY = "library",
    UNSPLASH = "unsplash",
    AI = "ai"
  }

  export let value: IRecordId | undefined = undefined;

  let isUploadInProgress = false;

  let selectedMethod: Method = Method.COLOR;
  let _value = transformValue(value);
  let imageFilesFromLibrary: IFile[] = [];

  onMount(async () => {
    if ($view.isConstrainedWidth) {
      orientation = Orientation.Vertical;
    }
    imageFilesFromLibrary = await fetchImageFilesFromLibrary();
  });

  function transformValue(value: IRecordId | undefined) {
    if (!value) return;
    if (typeof value === "string") {
      if (value.includes("gradient")) {
        return value.replace("gradient_", "");
      } else if (value.includes("hex")) {
        return value.replace("hex_", "");
      }
    }
    return value;
  }

  function onClose() {
    dispatch("close");
    modalEvent.hide(Action.COVER_PICKER);
  }

  function handleColorChange(e: CustomEvent) {
    if (e.detail.hex) {
      dispatch("select", `hex_${e.detail.hex}`);
    }
  }
  function handleGradientChange(e: CustomEvent) {
    dispatch("select", `gradient_${e.detail}`);
  }
  async function handleDrop(droppedFiles) {
    let files = Array.isArray(droppedFiles) ? droppedFiles : [droppedFiles];
    isUploadInProgress = true;

    let file = files[0];

    let imageLocalURL = new Blob([file], { type: file.type });
    let response = await account.uploadFileV2(
      file.type,
      file.name,
      imageLocalURL
    );

    if (response) {
      if (!response[0].id) return;
      value = response[0].id;
      _value = value;
      dispatch("select", value);
    }
    isUploadInProgress = false;
  }

  function fetchImageFilesFromLibrary() {
    return fileStore.selectMany({
      search: {
        properties: ["type"],
        query: "image"
      }
    });
  }
</script>

<div class="flex flex-col gap-6 w-full h-full p-6">
  <div class="flex flex-row items-center justify-between">
    <Text content="Pick a cover" style={TextStyle.PANEL_HEADING} />
    <Button icon="cross" on:click={onClose} />
  </div>
  <div
    class={cn("flex flex-1 gap-6 w-full overflow-auto", {
      "flex-col": orientation === Orientation.Vertical
    })}
  >
    <div
      class={cn({
        "h-full w-80": orientation === Orientation.Horizontal,
        "w-full py-8 h-40": orientation === Orientation.Vertical
      })}
    >
      <div
        class="flex flex-col gap-3 items-center justify-center h-full w-full bg-bgs2 rounded-md border border-brs3 border-dashed"
        use:fileDrop={{
          accept: ".jpg,.png,.pdf",
          multiple: true,
          maxSize: 15 * 1024 * 1024,
          onDrop: handleDrop
        }}
      >
        {#if isUploadInProgress}
          <span class="flex items-center gap-2 text-fgs1">
            <Icon icon="svg-spinners:90-ring-with-bg" class="stroke-fgs1" />
            <span>Uploading...</span>
          </span>
        {:else if typeof _value !== "string" && _value?.tb === Resource.file}
          <div class="flex w-full h-full items-center gap-2">
            <div class="flex w-40 h-full">
              {#key _value}
                <FileView
                  id={_value}
                  isLazyLoad={false}
                  type={FileType.IMAGE}
                  class={cn("h-full w-full rounded-l-md object-cover", {})}
                />
              {/key}
            </div>
            <span class="text-fgs1">Click to replace</span>
          </div>
        {:else}
          <span class="text-fgs1">Drag and drop / click to upload</span>
          <span class="text-fgs3 text-b3">or choose from below</span>
        {/if}
      </div>
    </div>
    <div
      class={cn("flex flex-col gap-4 flex-1 overflow-auto", {
        "w-full": orientation === Orientation.Vertical,
        "h-full": orientation === Orientation.Horizontal
      })}
    >
      <PanelSwitcher
        barStyle={BarStyle.EXACT}
        bind:value={selectedMethod}
        items={[
          {
            label: "Color",
            value: Method.COLOR,
            //   icon: "mage:color-picker"
            icon: "lets-icons:color-picker"
          },
          {
            label: "Gradient",
            value: Method.GRADIENT,
            //   icon: "carbon:color-switch"
            icon: "lets-icons:color-mode-light"
          },
          {
            label: "Library",
            value: Method.LIBRARY,
            icon: "ph:globe-thin"
          },
          {
            label: "Unsplash",
            value: Method.UNSPLASH,
            icon: "fa6-brands:unsplash"
          },
          {
            label: "AI",
            value: Method.AI,
            icon: "ph:magic-wand-light"
          }
        ]}
        style={PanelSwitcherStyle.BAR}
        isExpandToFullWidth={true}
        on:switch={(e) => {
          console.log(e);
        }}
      >
        <!-- <div slot="right">
          <Button icon="ph:dice-three" tooltip="Randomize" />
        </div> -->
      </PanelSwitcher>
      {#if selectedMethod === Method.COLOR}
        <div class="flex-1 flex items-center justify-center">
          <ColorPicker
            isHueMode={false}
            isShowPreview={false}
            on:change={handleColorChange}
            bind:hex={_value}
          />
        </div>
      {:else if selectedMethod === Method.GRADIENT}
        <GradientsSelector
          on:change={handleGradientChange}
          bind:value={_value}
        />
      {:else if selectedMethod === Method.LIBRARY}
        {#if imageFilesFromLibrary.length > 0}
          <div class="flex overflow-auto">
            <Resources
              resource={Resource.file}
              width={100}
              data={imageFilesFromLibrary}
              isPreventDefault={true}
              on:click={(e) => {
                if (e.detail.id) {
                  value = e.detail.id;
                  _value = value;
                  dispatch("select", value);
                }
              }}
            />
          </div>
        {:else}
          <div class="flex flex-1 w-full items-center justify-center">
            <EmptyStatusView subText="No images found from library" />
          </div>
        {/if}
      {:else}
        <div class="flex flex-1 w-full items-center justify-center">
          <ComingSoonView />
        </div>
      {/if}
    </div>
  </div>
</div>
