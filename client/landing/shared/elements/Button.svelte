<script lang="ts">
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import context from "@21n/stores/context.store";
  import view from "@21n/stores/view.store";
  import { OperatingSystem } from "@21n/types/context.type";
  import { cn } from "@21n/utils/ui.utils";
  import { Size } from "@21n/types/size.enum";
  import { landing } from "@21n/landing/shared/store/shared.store";
  import QrElement from "@21n/landing/shared/elements/QRElement.svelte";

  let {
    type = "primary",
    isShort = false,
    isDownloadButton = false,
    label: providedLabel = "",
    icon: providedIcon = "",
    href: providedHref = null,
    QRURL = null,
    iconPosition = "end",
    isHovering = $bindable(false),
    enableHover = true,
    onclick
  }: {
    type?: "primary" | "secondary";
    isShort?: boolean;
    isDownloadButton?: boolean;
    label?: string;
    icon?: string;
    href?: string | null;
    QRURL?: string | null;
    iconPosition?: "start" | "end";
    isHovering?: boolean;
    enableHover?: boolean;
    onclick?: () => void;
  } = $props();

  const href = $derived(
    isDownloadButton ? (resolveDownloadUrl(providedHref) ?? null) : providedHref
  );
  const icon = $derived(
    isDownloadButton ? resolveDownloadButtonIcon(href) : providedIcon
  );
  const label = $derived(
    isDownloadButton ? resolveDownloadButtonLabel(href) : providedLabel
  );

  function handleHover() {
    if (!enableHover) return;
    isHovering = true;
  }
  function handleLeave() {
    if (!enableHover) return;
    isHovering = false;
  }

  function handleClick() {
    if (!href && !isDownloadButton) {
      onclick?.();
    }
  }

  function resolveDownloadUrl(fallbackHref: string | null) {
    switch ($context.os) {
      case OperatingSystem.MACOS:
      case OperatingSystem.IOS:
        return $landing.urls.downloads?.ios;
      case OperatingSystem.WINDOWS:
        return $landing.urls.downloads?.windows;
      case OperatingSystem.ANDROID:
        return $landing.urls.downloads?.android;
      default:
        return fallbackHref;
    }
  }

  function resolveDownloadButtonIcon(resolvedHref: string | null) {
    const defaultIcon = "arrowright";
    if (!resolvedHref) {
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

  function resolveDownloadButtonLabel(resolvedHref: string | null) {
    const defaultLabel = "Get started for free";
    if (!resolvedHref) {
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

<a
  onmouseenter={handleHover}
  onmouseleave={handleLeave}
  class={cn(
    "box-border flex items-center justify-center gap-2 rounded-full mo:text-[16px] leading--[33px] mo:leading--[22px] cursor-pointer",
    {
      "bg-fgs1 hover:bg-fgs2 text-bgs1": type === "primary",
      "border border-fgs2 hover:bg-bgs3 text-fgs1 leading-7":
        type === "secondary",
      "text-base h-10 px-4": !isShort,
      "text-b2 h-8 px-3": isShort,
      "flex-row-reverse": iconPosition === "start"
    }
  )}
  href={isDownloadButton && !href ? $landing?.urls?.web : href}
  target={href ? "_blank" : "_self"}
  rel={href ? "noopener noreferrer" : undefined}
  onclick={handleClick}
>
  {#if icon}
    <SvgIcon
      {icon}
      size={Size.md}
      isRenderRaw={true}
      isAccentBg={type === "primary"}
    />
  {:else if QRURL && !$view.isPortrait}
    <QrElement bind:isHovering {enableHover} url={QRURL} width={48} />
  {/if}
  {#if label}
    <span class="text-nowrap">{label}</span>
  {/if}
</a>
