<script lang="ts">
  import { pointronPreferences } from "@21n/products/pointron/pointron.store";
  import { activeSession } from "@21n/products/pointron/focus/session.store";
  import Button from "@21n/elements/button/Button.svelte";
  import { Size } from "@21n/types/size.enum";
  import Presets from "@21n/products/pointron/focus/advanced/presets/Presets.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { cn } from "@21n/utils/ui.utils";
  import { appStore } from "@21n/stores/app.store";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  let {
    isExpandedVariant = true,
    parentBackgroundIndex = 1
  }: {
    isExpandedVariant?: boolean;
    parentBackgroundIndex?: number;
  } = $props();
  let isInEditMode: boolean = false;
  let selectedPresetIndex: number = $activeSession.composition
    ? $pointronPreferences.presets.indexOf($activeSession.composition)
    : 0;

  function onPresetSelection(event: any) {
    const preset = event.detail.preset;
    activeSession.onPresetSelection(preset);
    selectedPresetIndex = $pointronPreferences.presets.indexOf(preset);
  }

  function onAddNewClicked() {
    selectedPresetIndex = -1;
    showEditor();
  }
  function showEditor(id: string = "") {
    appStore.runAction(PointronAction.EDIT_PRESET, {
      componentParams: { id }
    });
  }

  function onEdit(event: any) {
    if (!event.detail.id) return;
    showEditor(event.detail.id);
  }
</script>

<div class="flex flex-col w-full flex-grow gap-2">
  <div
    class={cn("flex gap-2 items-center", {
      "w-full flex-col flex-grow": isExpandedVariant,
      "w-72 md:w-96 lg:w-[30rem]": !isExpandedVariant
    })}
  >
    <Presets
      {parentBackgroundIndex}
      {isExpandedVariant}
      {isInEditMode}
      onEdit={onEdit}
      onSelect={onPresetSelection}
    />
    {#if isInEditMode}
        <Button
          parentBgIndex={parentBackgroundIndex}
          onclick={onAddNewClicked}
        type={ButtonVariant.PRIMARY}
        style={ButtonStyle.OUTLINED}
        size={Size.sm}
        label="Add new preset"
        icon="plus"
      />
    {/if}
    <div
      class={cn("flex flex-col gap-2 py-3", {
        "pt-12": isInEditMode
      })}
    >
      {#if isExpandedVariant}
        <Button
          size={Size.sm}
          style={ButtonStyle.OUTLINED}
          isPreventMinWidth={true}
          onclick={() => {
            isInEditMode = !isInEditMode;
          }}
          >{isInEditMode ? "Close editor" : "Edit"}
        </Button>
      {:else}
        <button
          class="text-fgs3 text-b2 underline notouch:hover:text-aps1"
          onclick={() => {
            isInEditMode = !isInEditMode;
          }}>{isInEditMode ? "close editor" : "edit"}</button
        >
      {/if}
      {#if isInEditMode}
        <div class="flex w-full justify-center text-fgs4 text-b3">
          Tap the preset to edit
        </div>
      {/if}
    </div>
  </div>
</div>
