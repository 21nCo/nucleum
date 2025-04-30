<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import context from "$lib/client/stores/context.store";
  import view from "$lib/client/stores/view.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "../../../types/size.enum";
  import { landing } from "../store/shared.store";
  import QrElement from "./QRElement.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let type: "primary" | "secondary" = "primary";
  export let isShort: boolean = false;
  export let isDownloadButton: boolean = false;
  export let label = "";
  export let icon = "";
  export let href: string | null = null;
  /**
   * @deprecated - no longer used
   */
  export let QRURL: string | null = null;
  export let iconPosition: "start" | "end" = "end";
  export let isHovering: boolean = false;
  export let enableHover: boolean = true;

  if (isDownloadButton) {
    href = resolveDownloadUrl() ?? null;
    icon = resolveDownloadButtonIcon();
    label = resolveDownloadButtonLabel();
  }

  function handleHover() {
    if (!enableHover) return;
    isHovering = true;
  }
  function handleLeave() {
    if (!enableHover) return;
    isHovering = false;
  }

  function handleClick() {
    if (href) {
      landing.openLink(href);
    } else if (isDownloadButton) {
      if (!href) {
        landing.openLink($landing.urls.web ?? "");
      } else {
        landing.openLink(href);
      }
    } else {
      dispatch("click");
    }
  }

  function resolveDownloadUrl() {
    switch ($context.os) {
      case OperatingSystem.MACOS:
      case OperatingSystem.IOS:
        return $landing.urls.downloads?.ios;
      case OperatingSystem.WINDOWS:
        return $landing.urls.downloads?.windows;
      case OperatingSystem.ANDROID:
        return $landing.urls.downloads?.android;
      default:
        return href;
    }
  }

  function resolveDownloadButtonIcon() {
    const defaultIcon = "arrowright";
    if (!href) {
      return defaultIcon;
    }
    switch ($context.os) {
      case OperatingSystem.MACOS:
      case OperatingSystem.IOS:
        return "apple";
      case OperatingSystem.WINDOWS:
        return "windows";
      case OperatingSystem.ANDROID:
        return "android";
      default:
        return defaultIcon;
    }
  }

  function resolveDownloadButtonLabel() {
    const defaultLabel = "Get started for free";
    if (!href) {
      return defaultLabel;
    }
    switch ($context.os) {
      case OperatingSystem.MACOS:
        return "Download for Mac";
      case OperatingSystem.IOS:
        return "Download from App Store";
      case OperatingSystem.WINDOWS:
        return "Download for Windows";
      case OperatingSystem.ANDROID:
        return "Download from Play Store";
      default:
        return defaultLabel;
    }
  }
</script>

<button
  on:mouseenter={handleHover}
  on:mouseleave={handleLeave}
  class={cn(
    "box-border flex items-center justify-center gap-2 rounded-full mo:text-[16px] leading--[33px] mo:leading--[22px]",
    {
      "bg-fgs1 hover:bg-fgs2 text-bgs1": type === "primary",
      "border border-fgs2 hover:bg-bgs4 text-fgs1 leading-7":
        type === "secondary",
      "text-base h-10 px-4": !isShort,
      "text-b2 h-8 px-3": isShort,
      "flex-row-reverse": iconPosition === "start"
    }
  )}
  on:click={handleClick}
>
  {#if icon}
    <SvgIcon {icon} size={Size.md} isRenderRaw={true} />
  {:else if QRURL && !$view.isPortrait}
    <QrElement bind:isHovering bind:enableHover url={QRURL} width={48} />
  {/if}
  <span class="text-nowrap">{label}</span>
</button>
