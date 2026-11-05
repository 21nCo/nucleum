<script lang="ts">
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import Writer from "@nucleum/features/memory/capture/Writer.svelte";
  import { CaptureMethod } from "@nucleum/features/memory/capture/capture.type";
  import {
    ActiveCaptureStore,
    type IActiveCaptureStore
  } from "@nucleum/features/memory/capture/capture.store";
  import { generateResourceId } from "@nucleum/datafn/id.utils";
  import { haptic } from "@nucleum/client/runtime/embed/embed.utils";
  import PhoneHome from "@nucleum/surfaces/home/PhoneHome.svelte";
  import TypeSelectorOnMobile from "@nucleum/features/memory/capture/typeSelector/TypeSelectorOnMobile.svelte";
  import { fly } from "svelte/transition";
  import type { IRecordId } from "@nucleum/schema/legacy/data.type";
  import CaptureTopBar from "@nucleum/features/memory/capture/CaptureTopBar.svelte";
  import context from "@nucleum/client/runtime/context.store";
  import { OperatingSystem } from "@nucleum/client/runtime/context.type";
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import EmptyStatusView from "@21n/ui/elements/feedback/EmptyStatusView.svelte";
  import {
    AlertType,
    type InlineToast
  } from "@nucleum/shared-state/notifications/notification.type";
  import Button from "@21n/ui/elements/button/Button.svelte";
  import { ButtonVariant } from "@21n/ui/elements/button/button.type";
  import { inlineToasts } from "@nucleum/shared-state/notifications/notification.store";
  import NotificationListener from "@nucleum/shell/notifications/NotificationListener.svelte";
  import FileUploader from "@nucleum/features/memory/capture/FileUploader.svelte";
  import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
  import ComponentEmbedLayer from "@nucleum/shell/layers/ComponentEmbedLayer.svelte";
  import { quintOut } from "svelte/easing";
  import account from "@nucleum/client/runtime/account/account.store";
  import { UserDataMode } from "@nucleum/client/runtime/account/account.type";
  import InlineInfoBanner from "@21n/ui/elements/text/InlineInfoBanner.svelte";
  import { InfoTextType } from "@21n/ui/elements/text/info.type";
  let {
    captureId = $bindable(generateResourceId(Resource.capture))
  }: {
    captureId?: IRecordId;
  } = $props();
  let mode = $state<"capture" | undefined>(undefined);
  let captureStore = $state<IActiveCaptureStore>(
    ActiveCaptureStore.resolve(captureId)
  );
  let writerRef = $state<Writer | null>(null);
  const isBoxedLayout = true;
  let inlineToast = $state<InlineToast | null>(null);
  const dev_isExpandableCaptureSection = false;
  let dev_iosCameraCaptureMethod: "input" | "swift-relay" = "input";
  let cameraCaptureRef = $state<HTMLInputElement>();
  const transitionDuration = 250;
  initializeCaptureStore();

  function initializeCaptureStore() {
    captureId = generateResourceId(Resource.capture);
    captureStore = ActiveCaptureStore.resolve(captureId);
  }

  async function onTypeSelect(selected: string) {
    haptic("capture");
    if (
      selected === CaptureMethod.CAMERA &&
      $context.isEmbed &&
      $context.os === OperatingSystem.IOS &&
      dev_iosCameraCaptureMethod === "input"
    ) {
      triggerNativeCameraCaptureUsingInputAPI();
    } else if (
      selected !== CaptureMethod.UPLOAD &&
      selected !== CaptureMethod.PASTE
    ) {
      mode = "capture";
    }
    await captureStore.onTypeSelect(selected);

    function triggerNativeCameraCaptureUsingInputAPI() {
      setTimeout(() => {
        cameraCaptureRef?.click();
      }, 10);
    }
  }

  function onCameraCancel(e: Event) {
    logger.log({ at: "Capture.svelte - onCameraCancel", e });
    if (e.type === "cancel") {
      onClear();
    }
  }

  function onCaptureDraftSelect(draft: any) {
    captureStore = ActiveCaptureStore.resolve(draft.id);
    captureStore.load(draft);
    setModeToCapture();
  }

  function onClear() {
    reset();
  }

  async function onSave() {
    await captureStore.save();
    reset();
  }

  function reset() {
    mode = undefined;
    captureStore.reset();
    initializeCaptureStore();
  }

  function onInlineToastEvent(event: CustomEvent<InlineToast>) {
    haptic("success");
    inlineToast = event.detail;
  }

  function onInlineToastClose() {
    if (inlineToast) {
      inlineToasts.remove(inlineToast.id);
      inlineToast = null;
    }
  }

  function onInlineToastAction() {
    if (inlineToast?.data) {
      navigation.openResource(inlineToast.data.id, AccessMode.PAGE);
    }
    onInlineToastClose();
  }

  async function handleCapture(e: Event) {
    await captureStore.handleCapture(e);
    reset();
  }

  function focusWriter() {
    if (writerRef) {
      writerRef.focus();
    }
  }
  function setModeToCapture() {
    mode = "capture";
    haptic("capture");
  }
</script>

{#if $captureStore.isSaving}
  <EmptyStatusView
    isLoadingState={true}
    loadingText="Saving..."
    isFullPage={true}
  />
{:else}
  <PhoneHome isSlotExpanded={mode === "capture"}>
    {#snippet slot()}
      {#if mode === "capture"}
        <div
          class="flex items-center p-4"
          in:fly={{
            y: -20,
            duration: transitionDuration,
            easing: quintOut
          }}
        >
          <CaptureTopBar
            {captureStore}
            isHomeContext={true}
            onFocusBody={() => {
              writerRef?.focus();
            }}
            {onClear}
            {onSave}
          />
        </div>
      {/if}

      {#if inlineToast}
        {@const isError = inlineToast.type === AlertType.ERROR}
        <div
          class="px-3 pt-4"
          transition:fly={{
            y: -10,
            duration: transitionDuration,
            easing: quintOut
          }}
        >
          <div
            class="border border-dashed border-brs3 rounded-md py-2 pl-3 pr-1 flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <Icon
                icon={isError ? "x-circle" : "check-circle"}
                size={Size.sm}
                class={isError ? "text-ars1" : "text-ags1"}
                isFilled={!isError}
              />
              <span
                class={cn("text-b2", {
                  "text-fgs2": !isError,
                  "text-ars1": isError
                })}
              >
                {inlineToast.message}
              </span>
            </div>
            <div class="flex items-center gap-2">
              {#if !isError}
                <Button
                  label="View"
                  size={Size.sm}
                  isPreventMinWidth={true}
                  type={ButtonVariant.PRIMARY}
                  onclick={onInlineToastAction}
                />
              {/if}
              <Button icon="cross" onclick={onInlineToastClose} />
            </div>
          </div>
        </div>
      {/if}
      <div
        class={cn("flex-1 min-h-0 overflow-y-auto", {
          "mt-4": mode === undefined,
          "bg-bgs1 border-t border-brs2": isBoxedLayout,
          "rounded-t-[32px]": dev_isExpandableCaptureSection
        })}
      >
        <div class="flex-1 flex flex-col justify-between h-full w-full pt-3">
          <div class="flex flex-col justify-start px-4 w-full h-full">
            <div
              class={cn(
                "w-full flex items-start bg-bgs1 text-left mb-4 relative",
                {
                  "p-4 rounded-lg": !isBoxedLayout,
                  "min-h-32 grow": mode === undefined,
                  "h-full": mode === "capture"
                }
              )}
            >
              <!-- Double entry here to avoid keyboard adjustment issues on iOS Webview -->
              <button
                type="button"
                aria-label="Focus capture editor"
                class={cn("absolute w-full h-full", {
                  "z-50": mode === undefined,
                  "-z-10": mode === "capture"
                })}
                onclick={() => {
                  focusWriter();
                  if (!mode) setModeToCapture();
                }}
              ></button>
              {#if $captureStore.method === CaptureMethod.CAMERA && dev_iosCameraCaptureMethod === "input" && $context.isEmbed && $context.os === OperatingSystem.IOS}
                <!-- <CameraCaptureUsingInput {captureStore} /> -->
                <input
                  bind:this={cameraCaptureRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onchange={handleCapture}
                  oncancel={onCameraCancel}
                  id="cameraInput"
                  class="hidden"
                />
              {:else if $captureStore.method === CaptureMethod.UPLOAD && !($context.isEmbed && $context.os === OperatingSystem.IOS)}
                <FileUploader {captureStore} {onClear} />
              {:else}
                {#key $captureStore.refreshId}
                  <Writer
                    bind:this={writerRef}
                    {captureStore}
                    onChange={(e) => {
                      captureStore.onMdContentChanges(e);
                    }}
                    {onClear}
                  />
                {/key}
              {/if}
            </div>
            {#if mode === undefined && $account.dataMode !== UserDataMode.LOCAL && $context.isInOfflineMode}
              <div class="py-1.5">
                <InlineInfoBanner
                  type={InfoTextType.WARNING}
                  size={Size.sm}
                  content="File uploads are not supported yet when offline."
                />
              </div>
            {/if}
          </div>
          {#if !mode}
            <TypeSelectorOnMobile
              selected={$captureStore.method}
              onCapture={handleCapture}
              onDraftSelect={onCaptureDraftSelect}
              onSelect={onTypeSelect}
              onCancel={onClear}
            />
          {/if}
        </div>
      </div>
    {/snippet}
  </PhoneHome>
{/if}

<NotificationListener
  event={[GlobalEvent.INLINE_TOAST]}
  inlineToastId="nodecapture"
  onInlineToast={onInlineToastEvent}
/>
<ComponentEmbedLayer bg={2} />
