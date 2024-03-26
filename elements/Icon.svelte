<script lang="ts">
  import { SelectionItemActiveStyle } from "../types/switcher.enum";
  import Settings from "../icons/Settings.svelte";
  import PieChart from "../icons/PieChart.svelte";
  import Bolt from "../icons/Bolt.svelte";
  import Home from "../icons/Home.svelte";
  import Stack from "../icons/Stack.svelte";
  import { ChatIconVariant, IconVariant } from "../types/icon.type";
  import ChevronDouble from "../icons/ChevronDouble.svelte";
  import { Direction, Orientation } from "../types/direction.enum";
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
  import { userPreferences } from "../stores/app.store";
  import view from "$lib/tidy/stores/view.store";
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
  import {
    resolveIfActiveFgFg,
    retrieveCurrentColors
  } from "../utils/theme.utils";
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
  import appearance from "../stores/appearance.store";
  export let icon: string | undefined = undefined;
  export let variant: IconVariant = IconVariant.Outline;
  export let size: Size = Size.md;
  export let isActive: boolean = false;
  export let color: string | undefined = undefined; //" text-bgs1";
  export let bgColorHue: number | undefined = undefined;
  export let isOutlineForActive: boolean = false;
  $: isActiveFgFg = resolveIfActiveFgFg(bgColorHue, $appearance);
  $: defaultColor = retrieveCurrentColors($appearance)?.fgs2 ?? "";
  $: if (icon === "capture") isOutlineForActive = true;
  export let selectionStyle: SelectionItemActiveStyle =
    SelectionItemActiveStyle.NONE;
  export let hoverStyle: SelectionItemActiveStyle =
    SelectionItemActiveStyle.NONE;

  $: {
    variant =
      (isActive &&
        !isOutlineForActive &&
        icon != "chevright" &&
        icon != "chevleft" &&
        icon != "chevdown" &&
        icon != "chevup" &&
        icon != "list") ||
      icon == "chevdoubleleft" ||
      icon == "chevdoubleright" ||
      icon == "history" ||
      icon == "pip" ||
      icon == "logout" ||
      icon == "link" ||
      icon == "google" ||
      icon == "apple" ||
      icon == "grab" ||
      icon == "apple-dark" ||
      icon?.includes("-mini")
        ? IconVariant.Solid
        : IconVariant.Outline;
  }
</script>

{#if icon}
  <button class="flex items-center justify-center" on:click>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={icon.includes("-mini") && icon !== "capture2.0-mini"
        ? "0 0 20 20"
        : icon == "capture2.0" || icon === "capture2.0-mini"
          ? "0 0 52 52"
          : "0 0 24 24"}
      class="flex items-center justify-center {size == Size.xxl
        ? 'w-10 h-10'
        : size == Size.xl
          ? 'w-8 h-8 '
          : size == Size.lg
            ? 'w-6 h-6'
            : size == Size.md
              ? 'w-[1.25rem] h-[1.25rem]'
              : size == Size.sm
                ? 'w-4 h-4'
                : 'w-3 h-3'} {variant === IconVariant.Outline
        ? (isActive
            ? selectionStyle === SelectionItemActiveStyle.ACCENT_COLOR
              ? 'stroke-aps1'
              : selectionStyle === SelectionItemActiveStyle.ACCENT_BACKGROUND &&
                  !isActiveFgFg
                ? `stroke-bgs1`
                : 'stroke-fgs1'
            : `stroke-fgs3`) + ' stroke-[1.2] fill-none'
        : (isActive
            ? selectionStyle === SelectionItemActiveStyle.ACCENT_COLOR
              ? 'fill-aps1'
              : selectionStyle === SelectionItemActiveStyle.ACCENT_BACKGROUND &&
                  !isActiveFgFg
                ? `fill-bgs1`
                : 'fill-fgs1'
            : `fill-fgs3`) + ' stroke-none'} {hoverStyle ===
        SelectionItemActiveStyle.NONE || $view.isPortrait
        ? ''
        : variant === IconVariant.Outline
          ? ' hover:stroke-aps1'
          : ' hover:fill-aps1'}"
      style={!isActive
        ? variant === IconVariant.Outline
          ? `stroke: ${color ?? defaultColor}`
          : `fill: ${color ?? defaultColor}`
        : ""}
    >
      {#if icon === "home"}
        <Home {variant} />
      {:else if icon === "bolt" || icon === "focus"}
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
      {:else if icon === "link"}
        <Link />
      {:else if icon === "tag"}
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
      {:else if icon === "cross-circled"}
        <Cross {variant} isCircled={true} />
      {:else if icon === "cross"}
        <Cross {variant} isCircled={false} />
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
        <Chevron direction={Direction.Left} />
      {:else if icon === "chevright"}
        <Chevron direction={Direction.Right} />
      {:else if icon === "chevdown"}
        <Chevron direction={Direction.Down} />
      {:else if icon === "chevup"}
        <Chevron direction={Direction.Up} />
      {:else if icon === "download"}
        <Download {variant} />
      {:else if icon === "arrow-left"}
        <Arrow direction={Direction.Left} />
      {:else if icon === "arrow-right"}
        <Arrow direction={Direction.Right} />
      {:else if icon === "arrow-down-right"}
        <Arrow direction={Direction.BottomRight} />
      {:else if icon === "arrow-down-left"}
        <Arrow direction={Direction.BottomLeft} />
      {:else if icon === "arrow-up-right"}
        <Arrow direction={Direction.TopRight} {variant} />
      {:else if icon === "arrow-down-right-mini"}
        <Arrow direction={Direction.BottomRight} variant={IconVariant.Mini} />
      {:else if icon === "arrow-right-circled"}
        <Arrow direction={Direction.Right} isCircled={true} {variant} />
      {:else if icon === "arrow-right-circled-mini"}
        <Arrow
          direction={Direction.Right}
          isCircled={true}
          variant={IconVariant.Mini}
        />
      {:else if icon === "arrow-right-mini"}
        <Arrow direction={Direction.Right} variant={IconVariant.Mini} />
      {:else if icon === "full-screen"}
        <ArrowsPointingOut {variant} />
      {:else if icon === "collapse"}
        <ArrowsPointingIn {variant} />
      {:else if icon === "chevdoubleleft"}
        <ChevronDouble direction={Direction.Left} />
      {:else if icon === "chevdoubleright"}
        <ChevronDouble direction={Direction.Right} />
      {:else if icon === "search"}
        <Search {variant} />
      {:else if icon === "search-mini"}
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
      {:else if icon === "apple-dark"}
        <Apple isDark={true} />
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
      {:else if icon === "document-text"}
        <DocumentText {variant} />
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
  </button>
{/if}
