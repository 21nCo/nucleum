<script lang="ts">
  import Settings from "../icons/Settings.svelte";
  import PieChart from "../icons/PieChart.svelte";
  import Bolt from "../icons/Bolt.svelte";
  import Home from "../icons/Home.svelte";
  import Stack from "../icons/Stack.svelte";
  import { ChatIconVariant, IconVariant } from "../types/icon.type";
  import ChevronDouble from "../icons/ChevronDouble.svelte";
  import { Placement, Orientation } from "../types/direction.enum";
  import { Size } from "../types/size.enum";
  import Command from "../icons/Command.svelte";
  import Chevron from "../icons/Chevron.svelte";
  import Clock from "../icons/Clock.svelte";
  import Bell from "../icons/Bell.svelte";
  import Swatch from "../icons/Swatch.svelte";
  import Cube from "../icons/Cube.svelte";
  import Data from "../icons/Data.svelte";
  import AcademicCap from "../icons/AcademicCap.svelte";
  import Chat from "../icons/Chat.svelte";
  import List from "../icons/List.svelte";
  import Widget from "../icons/Widget.svelte";
  import Fire from "../icons/Fire.svelte";
  import Arrow from "../icons/Arrow.svelte";
  import Plus from "../icons/Plus.svelte";
  import Cross from "../icons/Cross.svelte";
  import Trash from "../icons/Trash.svelte";
  import Music from "../icons/Music.svelte";
  import Pencil from "../icons/Pencil.svelte";
  import Play2 from "../icons/Play2.svelte";
  import ArrowsPointingOut from "../icons/ArrowsPointingOut.svelte";
  import ArrowsPointingIn from "../icons/ArrowsPointingIn.svelte";
  import Minus from "../icons/Minus.svelte";
  import History from "../icons/History.svelte";
  import Code from "../icons/Code.svelte";
  import BarChart from "../icons/BarChart.svelte";
  import LineChart from "../icons/LineChart.svelte";
  import AreaChart from "../icons/AreaChart.svelte";
  import Folder from "../icons/Folder.svelte";
  import SidebarToggle from "../icons/SidebarToggle.svelte";
  import Info from "../icons/Info.svelte";
  import Link from "../icons/Link.svelte";
  import Tag from "../icons/Tag.svelte";
  import Image from "../icons/Image.svelte";
  import Share from "../icons/Share.svelte";
  import Users from "../icons/Users.svelte";
  import Copy from "../icons/Copy.svelte";
  import ArrowPath from "../icons/ArrowPath.svelte";
  import Sun from "../icons/Sun.svelte";
  import Heart from "../icons/Heart.svelte";
  import Rocket from "../icons/Rocket.svelte";
  import Archive from "../icons/Archive.svelte";
  import Search from "../icons/Search.svelte";
  import Ellipsis from "../icons/Ellipsis.svelte";
  import Upload from "../icons/Upload.svelte";
  import Bars from "../icons/Bars.svelte";
  import Squares from "../icons/Squares.svelte";
  import Pomodoro from "../icons/Pomodoro.svelte";
  import Download from "../icons/Download.svelte";
  import Bookmark from "../icons/Bookmark.svelte";
  import Pause from "../icons/Pause.svelte";
  import Adjustments from "../icons/Adjustments.svelte";
  import Pip from "../icons/Pip.svelte";
  import Zen from "../icons/Zen.svelte";
  import Envelope from "../icons/Envelope.svelte";
  import Youtube from "../branding/external/logos/Youtube.svelte";
  import Google from "../branding/external/logos/Google.svelte";
  import Apple from "../branding/external/logos/Apple.svelte";
  import VideoCamera from "../icons/VideoCamera.svelte";
  import QuestionMarkCircle from "../icons/QuestionMarkCircle.svelte";
  import Calendar from "../icons/Calendar.svelte";
  import CalendarDays from "../icons/CalendarDays.svelte";
  import LightBulb from "../icons/LightBulb.svelte";
  import Node from "../icons/Node.svelte";
  import Curation from "../icons/Curation.svelte";
  import Capture from "../icons/Capture.svelte";
  import CheckTwo from "../icons/CheckTwo.svelte";
  import Unpin from "../icons/Unpin.svelte";
  import Microphone from "../icons/Microphone.svelte";
  import Camera from "../icons/Camera.svelte";
  import BarsCenterLeft from "../icons/BarsCenterLeft.svelte";
  import CubeTransparent from "../icons/CubeTransparent.svelte";
  import Stop from "../icons/Stop.svelte";
  import Sparkles from "../icons/Sparkles.svelte";
  import Map from "../icons/Map.svelte";
  import Flag from "../icons/Flag.svelte";
  import LockClosed from "../icons/LockClosed.svelte";
  import Megaphone from "../icons/Megaphone.svelte";
  import Star from "../icons/Star.svelte";
  import FaceSmile from "../icons/FaceSmile.svelte";
  import Grab from "../icons/Grab.svelte";
  import Capture2 from "../icons/Capture2.0.svelte";
  import QueueList from "../icons/QueueList.svelte";
  import AtSymbol from "../icons/AtSymbol.svelte";
  import BookOpen from "../icons/BookOpen.svelte";
  import Square3Stack3d from "../icons/Square3Stack3d.svelte";
  import TableCells from "../icons/TableCells.svelte";
  import GlobeAlt from "../icons/GlobeAlt.svelte";
  import DocumentText from "../icons/DocumentText.svelte";
  import Funnel from "../icons/Funnel.svelte";
  import PaperClip from "../icons/PaperClip.svelte";
  import Eye from "../icons/Eye.svelte";
  import AltText from "../icons/AltText.svelte";
  import { cn } from "../utils/ui.utils";
  import Gift from "../icons/Gift.svelte";
  import LinkArrow2 from "../icons/LinkArrow2.svelte";
  import Pin from "../icons/Pin.svelte";
  import UnWiden from "../icons/UnWiden.svelte";
  import Widen from "../icons/Widen.svelte";
  import Split from "../icons/Split.svelte";
  import ArrowRightLeft from "../icons/ArrowRightLeft.svelte";
  import ArrowUTurnLeft from "../icons/ArrowUTurnLeft.svelte";
  import Warning from "../icons/Warning.svelte";
  import ArrowTurnDownLeft from "../icons/ArrowTurnDownLeft.svelte";
  import CursorArrowRays from "../icons/CursorArrowRays.svelte";
  import Document from "../icons/Document.svelte";
  import MagnifyingGlassPlus from "../icons/MagnifyingGlassPlus.svelte";
  import MagnifyingGlassMinus from "../icons/MagnifyingGlassMinus.svelte";
  import Underline from "../icons/Underline.svelte";
  import Strikethrough from "../icons/Strikethrough.svelte";
  import Highlight from "../icons/Highlight.svelte";
  // import IconifyIcon from "@iconify/svelte";
  import { logger } from "../components/debug/logger.client";
  import { isExtensionEnvironment } from "../utils/browser.utils";
  import Crop from "../icons/Crop.svelte";
  import PencilSimpleLine from "../icons/PencilSimpleLine.svelte";
  import Highlighter from "../icons/Highlighter.svelte";
  import PhCrossCircled from "../icons/PhCrossCircled.svelte";
  import PhBookmarks from "../icons/PhBookmarks.svelte";
  import PhArrowElbow from "../icons/PhArrowElbow.svelte";
  import {
    resolveSpriteSheetPath,
    extensionSprites
  } from "../iconsV2/icon.store";
  import EclipseHalf from "../iconsV2/svgSpinners/EclipseHalf.svelte";
  import One80RingWithBg from "../iconsV2/svgSpinners/One80RingWithBg.svelte";
  import NinetyRingWithBg from "../iconsV2/svgSpinners/NinetyRingWithBg.svelte";
  import ThreeDotsFade from "../iconsV2/svgSpinners/ThreeDotsFade.svelte";

  export let icon: string | undefined = undefined;
  export let size: Size.xs | Size.sm | Size.md | Size.lg | Size.xl | Size.xxl =
    Size.md;
  /**
   * When an icon context switches between normal and accent bg as its parent.
   * If undefined, the icon will not change its appearance based on the context.
   * If true, the icon will have fill considering the accent bg is active on the parent.
   * If false, the icon will have stroke considering the accent bg is not active on the parent.
   */
  export let isAccentBgContext: boolean | undefined = undefined;
  /**
   * Similar to accent color context, this is for custom bg context.
   */
  export let isCustomBgContext: boolean | undefined = undefined;
  /**
   * Whether the icon is tabbable or not. Default is false as icons are used in buttons and other elements that are tabbable by default.
   */
  export let isTabbable: boolean = false;

  /**
   * Used for iconify icons to determine if the icon should be filled or not.
   */
  export let isFilled: boolean = false;

  $: renderedIconifyIcon = resolveRenderedIconForIconify(icon, isFilled);

  let classListParam = "";
  let dev_useIconifyTailwind = false;
  let isUseIconifySprite = true;
  export { classListParam as class };
  let _classList = "";
  let variant: IconVariant = IconVariant.Outline;
  const solidOnlyIcons = [
    "chevdoubleleft",
    "chevdoubleright",
    "history",
    "pip",
    "logout",
    "link",
    "google",
    "apple",
    "grab",
    "capture2.0-mini"
  ];
  const strokeOnlyIcons = [
    "link-arrow-left",
    "link-arrow-down",
    "capture",
    "highlight"
  ];

  $: _classList = resolveClasses(
    classListParam,
    isAccentBgContext,
    isCustomBgContext
  );

  function resolveClasses(
    clParam: string,
    isAbgContext: boolean | undefined,
    isCuBgContext: boolean | undefined
  ) {
    let classes = "stroke-fgs1";
    if (isAbgContext != undefined) {
      classes = isAbgContext ? "fill-abg" : "stroke-fgs1";
    } else if (isCuBgContext != undefined) {
      classes = isCuBgContext ? "fill-cbg" : "stroke-fgs1";
    } else if (clParam) {
      classes = clParam;
    }
    if (
      icon &&
      (solidOnlyIcons.includes(icon) || icon?.includes("-mini")) &&
      classes.includes("stroke-")
    ) {
      const color = classes.split("stroke-")[1];
      classes = `fill-${color}`;
    } else if (
      icon &&
      strokeOnlyIcons.includes(icon) &&
      classes.includes("fill-")
    ) {
      const color = classes.split("fill-")[1];
      classes = `stroke-${color}`;
    }
    classes = classes + appendIconfiyClasses(classes);
    if (classes.includes("stroke-")) {
      classes = classes + " fill-none";
    } else if (classes.includes("fill-")) {
      classes = classes + " stroke-none";
    }
    return classes;

    function appendIconfiyClasses(classes: string) {
      if (icon?.includes(":")) {
        const color = classes.split("stroke-")[1] || classes.split("fill-")[1];
        return ` text-${color}`;
      }
      return "";
    }
  }
  $: variant = resolveVariant(icon, _classList, size);

  function resolveVariant(icon: string | undefined, cls: string, size: Size) {
    if (
      (icon && solidOnlyIcons.includes(icon)) ||
      icon?.includes("-mini") ||
      size === Size.xs
    ) {
      return IconVariant.Solid;
    } else {
      return cls.includes("fill-none")
        ? IconVariant.Outline
        : IconVariant.Solid;
    }
  }

  function resolveRenderedIconForIconify(
    icon: string | undefined,
    isFilled: boolean
  ) {
    if (!icon || !icon.includes(":") || icon.includes("text:")) {
      return undefined;
    }
    let renderedIcon = icon;
    if (icon.includes("fa6-brands") || icon.includes("lets-icons")) {
      renderedIcon = icon;
    } else if (icon.includes("-light")) {
      renderedIcon = isFilled ? icon.replace("-light", "-fill") : icon;
    } else if (icon.includes("-thin")) {
      renderedIcon = isFilled ? icon.replace("-thin", "-fill") : icon;
    } else if (icon.includes("heroicons")) {
      renderedIcon = isFilled ? icon + "-solid" : icon;
    }
    if (dev_useIconifyTailwind) {
      renderedIcon = renderedIcon.replace(":", "--");
    }
    return renderedIcon;
  }

  function resolveSpriteIconPath(icon: string) {
    let sheet = "sprite";
    if (icon.startsWith("ph:")) {
      if (icon.endsWith("-light")) {
        sheet = "sprite-ph-light";
      } else if (icon.endsWith("-fill")) {
        sheet = "sprite-ph-fill";
      } else if (icon.endsWith("-thin")) {
        sheet = "sprite-ph-thin";
      } else if (icon.endsWith("-duotone")) {
        sheet = "sprite-ph-duotone";
      } else {
        sheet = "sprite-ph-base";
      }
    }
    const path = resolveSpriteSheetPath(sheet);
    if (isExtensionEnvironment()) {
      // if (!isContentScript()) {
      //   const url = `${path}#${icon}`;
      //   return chrome.runtime.getURL(url);
      // }
      if (extensionSprites.has(sheet)) {
        const sprite = extensionSprites.get(sheet);
        return `${sprite}#${icon}`;
      }
      return null;
    }
    return `${path}#${icon}`;
  }
</script>

<button
  class={cn("relative inline-flex items-center justify-center")}
  tabindex={isTabbable ? 0 : -1}
  on:click
>
  {#if icon?.includes(":") && renderedIconifyIcon}
    {@const sizeClass =
      size === Size.xxl
        ? "w-12 h-12"
        : size === Size.xl
          ? "w-7 h-7"
          : size === Size.lg
            ? "w-6 h-6"
            : size === Size.md
              ? "w-5 h-5"
              : "w-4 h-4"}
    {#if icon.startsWith("svg-spinners")}
      <div class={cn(_classList, "iconifysvg", sizeClass, renderedIconifyIcon)}>
        {#if icon.includes("3-dots-fade")}
          <ThreeDotsFade />
        {:else if icon.includes("90-ring-with-bg")}
          <NinetyRingWithBg />
        {:else if icon.includes("180-ring-with-bg")}
          <One80RingWithBg />
        {:else if icon.includes("eclipse-half")}
          <EclipseHalf />
        {/if}
      </div>
    {:else if isUseIconifySprite}
      <svg class={cn(_classList, "iconifysvg", sizeClass)}>
        <use href={resolveSpriteIconPath(renderedIconifyIcon)} />
      </svg>
    {:else if dev_useIconifyTailwind}
      <span class="iconify text-fgs1 {renderedIconifyIcon} w-5 h-5"></span>
    {:else}
      <!-- <div
        class={cn(renderedIconifyIcon, {
          "w-14 h-14": size === Size.xxl,
          "w-8 h-8": size === Size.xl,
          "w-6 h-6": size === Size.lg,
          "w-[1.25rem] h-[1.25rem]": size === Size.md,
          "w-4 h-4": size === Size.sm,
          "w-3 h-3": size === Size.xs
        })}
      >
        <IconifyIcon
      icon={renderedIconifyIcon}
      width={sizePx}
      height={sizePx}
      class={_classList + " iconifysvg "}
    />
      </div> -->
    {/if}
  {:else if icon?.includes("text:")}
    {@const sizeClass =
      size === Size.xxl
        ? "w-12 h-12"
        : size === Size.xl
          ? "w-7 h-7"
          : size === Size.lg
            ? "w-6 h-6"
            : size === Size.md
              ? "w-5 h-5"
              : "w-4 h-4"}
    <span
      class={cn(
        _classList,
        "iconifysvg flex items-center justify-center",
        sizeClass
      )}
    >
      {icon.split("text:")[1]}
    </span>
  {:else if icon}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={icon.includes("-mini") && icon !== "capture2.0-mini"
        ? "0 0 20 20"
        : icon == "capture2.0" || icon === "capture2.0-mini"
          ? "0 0 52 52"
          : "0 0 24 24"}
      class={cn(
        "flex items-center justify-center",
        _classList,
        {
          "w-3 h-3": icon.includes("-mini")
        },
        !icon.includes("-mini") && {
          "w-8 h-8": size === Size.xl,
          "w-6 h-6": size === Size.lg,
          "w-[1.25rem] h-[1.25rem]": size === Size.md,
          "w-4 h-4": size === Size.sm,
          "w-3 h-3": size === Size.xs
        }
      )}
    >
      {#if icon === "home"}
        <Home {variant} />
      {:else if icon === "bolt"}
        <Bolt {variant} />
      {:else if icon === "bolt-micro"}
        <Bolt variant={IconVariant.Micro} />
      {:else if icon === "chart"}
        <PieChart {variant} />
      {:else if icon === "barchart"}
        <BarChart {variant} />
      {:else if icon === "barchart-presentation"}
        <BarChart {variant} style="presentation" />
      {:else if icon === "areachart"}
        <AreaChart {variant} />
      {:else if icon === "linechart"}
        <LineChart {variant} />
      {:else if icon === "settings"}
        <Settings {variant} />
      {:else if icon === "rectangle-stack" || icon === "goals"}
        <Stack {variant} />
      {:else if icon === "command"}
        <Command {variant} />
      {:else if icon === "sidebar-toggle"}
        <SidebarToggle {variant} />
      {:else if icon === "info"}
        <Info {variant} />
      {:else if icon === "warning"}
        <Warning {variant} />
      {:else if icon === "link"}
        <Link />
      {:else if icon === "link-mini"}
        <Link variant={IconVariant.Mini} />
      {:else if icon === "tag" || icon === "ph:tag-thin"}
        <Tag {variant} />
      {:else if icon === "share"}
        <Share {variant} />
      {:else if icon === "share-mini"}
        <Share variant={IconVariant.Mini} />
      {:else if icon === "users"}
        <Users {variant} />
      {:else if icon === "copy"}
        <Copy {variant} />
      {:else if icon === "arrow-path" || icon === "sync"}
        <ArrowPath {variant} />
      {:else if icon === "sun"}
        <Sun {variant} />
      {:else if icon === "clock"}
        <Clock {variant} />
      {:else if icon === "clock-mini"}
        <Clock variant={IconVariant.Mini} />
      {:else if icon === "folder"}
        <Folder {variant} />
      {:else if icon === "history"}
        <History {variant} />
      {:else if icon === "code"}
        <Code {variant} />
      {:else if icon === "bell"}
        <Bell {variant} />
      {:else if icon === "palette"}
        <Swatch {variant} />
      {:else if icon === "cube"}
        <Cube {variant} />
      {:else if icon === "cube-transparent"}
        <CubeTransparent {variant} />
      {:else if icon === "data"}
        <Data {variant} />
      {:else if icon === "list"}
        <List {variant} />
      {:else if icon === "rectangle-group" || icon === "widget"}
        <Widget {variant} />
      {:else if icon === "fire"}
        <Fire {variant} />
      {:else if icon === "music"}
        <Music {variant} />
      {:else if icon === "pencil"}
        <Pencil {variant} />
      {:else if icon === "pencil-mini"}
        <Pencil variant={IconVariant.Mini} />
      {:else if icon === "pencil-square"}
        <Pencil {variant} isWithSquare={true} />
      {:else if icon === "play"}
        <Play2 {variant} />
      {:else if icon === "play-circled"}
        <Play2 {variant} isCircled={true} />
      {:else if icon === "play-circled-mini"}
        <Play2 variant={IconVariant.Mini} isCircled={true} />
      {:else if icon === "plus"}
        <Plus {variant} isCircled={false} />
      {:else if icon === "plus-circled"}
        <Plus {variant} isCircled={true} />
      {:else if icon === "minus"}
        <Minus {variant} isCircled={false} />
      {:else if icon === "minus-circled"}
        <Minus {variant} isCircled={true} />
      {:else if icon === "unpin"}
        <Unpin />
      {:else if icon === "pin"}
        <Pin />
      {:else if icon === "cross-circled"}
        <Cross {variant} isCircled={true} />
      {:else if icon === "cross"}
        <Cross {variant} isCircled={false} />
      {:else if icon === "cross-mini"}
        <Cross isCircled={false} variant={IconVariant.Mini} />
      {:else if icon === "trash"}
        <Trash {variant} />
      {:else if icon === "pause"}
        <Pause {variant} />
      {:else if icon === "chatleftright"}
        <Chat {variant} chatIconVariant={ChatIconVariant.LeftRight} />
      {:else if icon === "chat-bubble-bottom-center"}
        <Chat {variant} chatIconVariant={ChatIconVariant.BottomCenter} />
      {:else if icon === "academic-cap"}
        <AcademicCap {variant} />
      {:else if icon === "chevleft"}
        <Chevron direction={Placement.Left} />
      {:else if icon === "chevright"}
        <Chevron direction={Placement.Right} />
      {:else if icon === "chevdown"}
        <Chevron direction={Placement.Bottom} />
      {:else if icon === "chevup"}
        <Chevron direction={Placement.Top} />
      {:else if icon === "download"}
        <Download {variant} />
      {:else if icon === "arrow-left"}
        <Arrow direction={Placement.Left} />
      {:else if icon === "arrow-right"}
        <Arrow direction={Placement.Right} />
      {:else if icon === "arrow-up"}
        <Arrow direction={Placement.Top} />
      {:else if icon === "arrow-down"}
        <Arrow direction={Placement.Bottom} />
      {:else if icon === "arrow-down-right"}
        <Arrow direction={Placement.BottomRight} />
      {:else if icon === "arrow-down-left"}
        <Arrow direction={Placement.BottomLeft} />
      {:else if icon === "arrow-up-right"}
        <Arrow direction={Placement.TopRight} {variant} />
      {:else if icon === "arrow-up-right-mini"}
        <Arrow direction={Placement.TopRight} variant={IconVariant.Mini} />
      {:else if icon === "arrow-down-right-mini"}
        <Arrow direction={Placement.BottomRight} variant={IconVariant.Mini} />
      {:else if icon === "arrow-right-circled"}
        <Arrow direction={Placement.Right} isCircled={true} {variant} />
      {:else if icon === "arrow-right-circled-mini"}
        <Arrow
          direction={Placement.Right}
          isCircled={true}
          variant={IconVariant.Mini}
        />
      {:else if icon === "arrow-right-mini"}
        <Arrow direction={Placement.Right} variant={IconVariant.Mini} />
      {:else if icon === "full-screen"}
        <ArrowsPointingOut {variant} />
      {:else if icon === "collapse"}
        <ArrowsPointingIn {variant} />
      {:else if icon === "arrow-right-left"}
        <ArrowRightLeft {variant} />
      {:else if icon === "arrow-uturn-left"}
        <ArrowUTurnLeft {variant} />
      {:else if icon === "arrow-turn-down-left"}
        <ArrowTurnDownLeft {variant} />
      {:else if icon === "widen"}
        <Widen />
      {:else if icon === "unwiden"}
        <UnWiden />
      {:else if icon === "split"}
        <Split />
      {:else if icon === "collapse"}
        <ArrowsPointingIn {variant} />
      {:else if icon === "chevdoubleleft"}
        <ChevronDouble direction={Placement.Left} />
      {:else if icon === "chevdoubleright"}
        <ChevronDouble direction={Placement.Right} />
      {:else if icon === "search" && size != Size.xs}
        <Search {variant} />
      {:else if icon === "search" && size === Size.xs}
        <Search variant={IconVariant.Mini} />
      {:else if icon === "heart"}
        <Heart {variant} />
      {:else if icon === "rocket"}
        <Rocket {variant} />
      {:else if icon === "upload"}
        <Upload {variant} />
      {:else if icon === "archive"}
        <Archive {variant} />
      {:else if icon === "image"}
        <Image {variant} />
      {:else if icon === "ellipsis"}
        <Ellipsis orientation={Orientation.Horizontal} />
      {:else if icon === "ellipsis-vertical"}
        <Ellipsis orientation={Orientation.Vertical} />
      {:else if icon === "ellipsis-circled"}
        <Ellipsis orientation={Orientation.Horizontal} isCircled={true} />
      {:else if icon === "bars"}
        <Bars {variant} />
      {:else if icon === "bars-center-left"}
        <BarsCenterLeft {variant} />
      {:else if icon === "squares-2x2"}
        <Squares {variant} />
      {:else if icon === "pomodoro"}
        <Pomodoro {variant} />
      {:else if icon === "bookmark"}
        <Bookmark {variant} />
      {:else if icon === "pip"}
        <Pip {variant} />
      {:else if icon === "zen"}
        <Zen {variant} />
      {:else if icon === "adjustments-vertical"}
        <Adjustments {variant} orientation={Orientation.Vertical} />
      {:else if icon === "adjustments-horizontal"}
        <Adjustments {variant} orientation={Orientation.Horizontal} />
      {:else if icon === "envelope" || icon === "mail"}
        <Envelope {variant} />
      {:else if icon === "google"}
        <Google />
      {:else if icon === "youtube"}
        <Youtube />
      {:else if icon === "apple"}
        <Apple />
      {:else if icon === "video-camera"}
        <VideoCamera {variant} />
      {:else if icon === "help"}
        <QuestionMarkCircle {variant} />
      {:else if icon === "help-mini"}
        <QuestionMarkCircle variant={IconVariant.Mini} />
      {:else if icon === "calendar"}
        <Calendar {variant} />
      {:else if icon === "calendar-days" || icon === "journal"}
        <CalendarDays {variant} />
      {:else if icon === "light-bulb"}
        <LightBulb {variant} />
      {:else if icon === "node"}
        <Node {variant} />
      {:else if icon === "curation"}
        <Curation {variant} />
      {:else if icon === "capture"}
        <Capture />
      {:else if icon === "capture2.0"}
        <Capture2 {variant} />
      {:else if icon === "check-circle"}
        <CheckTwo {variant} isCircled={true} />
      {:else if icon === "microphone"}
        <Microphone {variant} />
      {:else if icon === "camera"}
        <Camera {variant} />
      {:else if icon === "stop"}
        <Stop {variant} />
      {:else if icon === "sparkles"}
        <Sparkles {variant} />
      {:else if icon === "map"}
        <Map {variant} />
      {:else if icon === "flag"}
        <Flag {variant} />
      {:else if icon === "lock-closed"}
        <LockClosed {variant} />
      {:else if icon === "megaphone"}
        <Megaphone {variant} />
      {:else if icon === "star"}
        <Star {variant} />
      {:else if icon === "face-smile"}
        <FaceSmile {variant} />
      {:else if icon === "grab"}
        <Grab {variant} />
      {:else if icon === "queue-list"}
        <QueueList {variant} />
      {:else if icon === "at-symbol"}
        <AtSymbol {variant} />
      {:else if icon === "book-open"}
        <BookOpen {variant} />
      {:else if icon === "square-3-stack-3d"}
        <Square3Stack3d {variant} />
      {:else if icon === "table-cells"}
        <TableCells {variant} />
      {:else if icon === "globe-alt"}
        <GlobeAlt {variant} />
      {:else if icon === "document"}
        <Document {variant} />
      {:else if icon === "document-text"}
        <DocumentText {variant} />
      {:else if icon === "funnel"}
        <Funnel {variant} />
      {:else if icon === "paper-clip"}
        <PaperClip {variant} />
      {:else if icon === "eye" || icon === "bird"}
        <Eye {variant} />
      {:else if icon === "alt-text"}
        <AltText />
      {:else if icon === "gift"}
        <Gift {variant} />
      {:else if icon === "ph:crop"}
        <Crop {variant} />
      {:else if icon === "ph:pencil-simple-line"}
        <PencilSimpleLine {variant} />
      {:else if icon === "ph:highlighter"}
        <Highlighter {variant} />
      {:else if icon === "ph:x-circle"}
        <PhCrossCircled {variant} />
      {:else if icon === "ph:bookmarks"}
        <PhBookmarks {variant} />
      {:else if icon === "ph:arrow-elbow-down-left"}
        <PhArrowElbow variant="down-left" />
      {:else if icon === "ph:arrow-elbow-right-up"}
        <PhArrowElbow variant="right-up" />
      {:else if icon === "magnifying-glass-plus"}
        <MagnifyingGlassPlus {variant} />
      {:else if icon === "magnifying-glass-minus"}
        <MagnifyingGlassMinus {variant} />
      {:else if icon === "underline"}
        <Underline {variant} />
      {:else if icon === "strikethrough"}
        <Strikethrough {variant} />
      {:else if icon === "highlight"}
        <Highlight />
      {:else if icon === "cursor-arrow-rays"}
        <CursorArrowRays {variant} />
      {:else if icon === "link-arrow-left"}
        <LinkArrow2 />
      {:else if icon === "link-arrow-down"}
        <LinkArrow2 direction={Placement.Bottom} />
      {:else if icon === "login"}
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
        />
      {:else if icon === "logout"}
        <path
          fill-rule="evenodd"
          d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z"
          clip-rule="evenodd"
        />
      {/if}
    </svg>
  {/if}
</button>

<style>
  :global(.iconifysvg *) {
    stroke-width: initial !important;
  }
</style>
