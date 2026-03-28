<script lang="ts">
  import modalEvent from "@21n/components/modal/modal.store";
  import { Action } from "@21n/types/action.enum";
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "@21n/types/switcher.enum";
  import { TextStyle } from "@21n/types/text.enum";
  import Button from "@21n/elements/button/Button.svelte";
  import ColorPicker from "@21n/elements/colorPicker/ColorPicker.svelte";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import { createEventDispatcher, onMount } from "svelte";
  import GradientsSelector from "@21n/elements/colorPicker/gradients/GradientsSelector.svelte";
  import { fileDrop } from "@21n/actions/fileDrop.action";
  import Icon from "@21n/elements/Icon.svelte";
  import account from "@21n/stores/account.store";
  import type { IRecordId } from "@21n/types/data.type";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import FileView from "@21n/components/files/FileView.svelte";
  import { FileType } from "@21n/components/files/file.type";
  import { cn } from "@21n/utils/ui.utils";
  import ComingSoonView from "@21n/elements/ComingSoonView.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import view from "@21n/stores/view.store";
  import UnsplashPicker from "@21n/elements/coverPicker/UnsplashPicker.svelte";
  import CoverPickerFromLibrary from "@21n/elements/coverPicker/CoverPickerFromLibrary.svelte";
  import { isRecordId } from "@21n/components/flux/resourceStores/resource.utils";
  import { appStore } from "@21n/stores/app.store";
  import { resolveProductConfig } from "@21n/products/product.config";

  const dispatch = createEventDispatcher();

  enum Method {
    COLOR = "color",
    GRADIENT = "gradient",
    LIBRARY = "library",
    UNSPLASH = "unsplash",
    AI = "ai"
  }

  export let orientation: Orientation = Orientation.Vertical;
  export let value: IRecordId | undefined = undefined;

  $: isFileUploadAvailable = resolveProductConfig(
    $appStore.product
  ).tableConfig.some((table) => table.name === Resource.file);

  let selectedMethod: Method = Method.COLOR;
  let _value: string | undefined = transformValue(value);
  let isUploadInProgress = false;

  onMount(async () => {
    if ($view.isConstrainedWidth) {
      orientation = Orientation.Vertical;
    }
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
      dispatch("change", `hex_${e.detail.hex}`);
    }
  }

  function handleColorChangeDebounced(e: CustomEvent) {
    if (e.detail.hex) {
      dispatch("select", `hex_${e.detail.hex}`);
    }
  }

  function handleGradientChange(e: CustomEvent) {
    dispatch("select", `gradient_${e.detail}`);
  }
  async function handleDrop(droppedFiles: File[]) {
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

  function resolvePanelSwitcherItems(isFileUploadAvailable: boolean) {
    const baseItems = [
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
        label: "Unsplash",
        value: Method.UNSPLASH,
        icon: "fa6-brands:unsplash"
      },
      {
        label: "AI",
        value: Method.AI,
        icon: "magic-wand",
        isDisabled: true,
        badge: "soon"
      }
    ];
    if (!isFileUploadAvailable) {
      return baseItems;
    }
    const fromLibary = {
      label: "Library",
      value: Method.LIBRARY,
      icon: "globe"
    };
    return [...baseItems.slice(0, 3), fromLibary, ...baseItems.slice(3)];
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
    {#if isFileUploadAvailable}
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
          {:else if isRecordId(_value, Resource.file)}
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
    {/if}
    <div
      class={cn("flex flex-col gap-4 flex-1 overflow-auto", {
        "w-full": orientation === Orientation.Vertical,
        "h-full": orientation === Orientation.Horizontal
      })}
    >
      <PanelSwitcher
        barStyle={BarStyle.EXACT}
        bind:value={selectedMethod}
        items={resolvePanelSwitcherItems(isFileUploadAvailable)}
        style={PanelSwitcherStyle.BAR}
        isExpandToFullWidth={true}
        on:switch={(e) => {
          console.log(e);
        }}
      >
        <!-- <div slot="right">
          <Button icon="randomize" tooltip="Randomize" />
        </div> -->
      </PanelSwitcher>
      {#if selectedMethod === Method.COLOR}
        <div class="flex-1 flex items-center justify-center">
          <ColorPicker
            isHueMode={false}
            isShowPreview={false}
            on:change={handleColorChange}
            on:debouncedChange={handleColorChangeDebounced}
            bind:hex={_value}
          />
        </div>
      {:else if selectedMethod === Method.GRADIENT}
        <GradientsSelector
          on:change={handleGradientChange}
          value={_value ?? ""}
        />
      {:else if selectedMethod === Method.LIBRARY}
        <CoverPickerFromLibrary
          on:click={(e) => {
            if (e.detail.file) {
              const _id = isRecordId(e.detail.file)
                ? e.detail.file
                : e.detail.file.id;
              value = _id;
              _value = value;
              dispatch("select", value);
            }
          }}
        />
      {:else if selectedMethod === Method.UNSPLASH}
        <UnsplashPicker on:select={(e) => dispatch("select", e.detail)} />
      {:else}
        <div class="flex flex-1 w-full items-center justify-center">
          <ComingSoonView />
        </div>
      {/if}
    </div>
  </div>
</div>
