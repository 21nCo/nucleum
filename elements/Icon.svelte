<script lang="ts">
  import { SelectionItemActiveStyle } from "../types/switcher.enum";
  import Settings from "../icons/Settings.svelte";
  import Insights from "../icons/Insights.svelte";
  import Bolt from "../icons/Bolt.svelte";
  import Home from "../icons/Home.svelte";
  import Stack from "../icons/Stack.svelte";
  import { ChatIconVariant, IconVariant } from "../types/icon.type";
  import ChevronDouble from "../icons/ChevronDouble.svelte";
  import { Direction } from "../types/direction.enum";
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
  import Add from "../icons/Add.svelte";
  import Cross from "../icons/Cross.svelte";
  import { windowObject } from "../stores/app.store";
  import Trash from "../icons/Trash.svelte";
  import Play from "../icons/Play.svelte";
  import Music from "../icons/Music.svelte";
  import Pencil from "../icons/Pencil.svelte";
  export let icon: string | undefined = undefined;
  export let variant: IconVariant = IconVariant.Outline;
  export let size: Size = Size.md;
  export let isActive: boolean = false;
  export let color: string = "fgs1";
  export let selectionStyle: SelectionItemActiveStyle =
    SelectionItemActiveStyle.NONE;
  export let hoverStyle: SelectionItemActiveStyle =
    SelectionItemActiveStyle.NONE;
  $: variant =
    (isActive && icon != "chevright" && icon != "chevleft" && icon != "list") ||
    icon == "chevdoubleleft" ||
    icon == "chevdoubleright" ||
    icon == "logout" ||
    icon?.includes("-mini")
      ? IconVariant.Solid
      : IconVariant.Outline;
</script>

{#if icon}
  <button on:click>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={icon.includes("-mini") ? "0 0 20 20" : "0 0 24 24"}
      class="{size == Size.xl
        ? 'w-8 h-8'
        : size == Size.lg
        ? 'w-6 h-6'
        : size == Size.md
        ? 'w-5 h-5'
        : 'w-4 h-4'} {variant === IconVariant.Outline
        ? (isActive
            ? selectionStyle === SelectionItemActiveStyle.ACCENT_COLOR
              ? 'stroke-accent1'
              : 'stroke-bgs1'
            : `stroke-${color}`) + ' stroke-[1.2] fill-none'
        : (isActive
            ? selectionStyle === SelectionItemActiveStyle.ACCENT_COLOR
              ? 'fill-accent1'
              : 'fill-bgs1'
            : `fill-${color}`) + ' stroke-none'} {hoverStyle ===
        SelectionItemActiveStyle.NONE || $windowObject.isInPortraitMode
        ? ''
        : variant === IconVariant.Outline
        ? ' hover:stroke-accent1'
        : ' hover:fill-accent1'}"
    >
      {#if icon === "home"}
        <Home {variant} />
      {:else if icon === "focus"}
        <Bolt {variant} />
      {:else if icon === "insights"}
        <Insights {variant} />
      {:else if icon === "settings"}
        <Settings {variant} />
      {:else if icon === "goals"}
        <Stack {variant} />
      {:else if icon === "command"}
        <Command {variant} />
      {:else if icon === "clock"}
        <Clock {variant} />
      {:else if icon === "clock-mini"}
        <Clock variant={IconVariant.Mini} />
      {:else if icon === "bell"}
        <Bell {variant} />
      {:else if icon === "palette"}
        <Swatch {variant} />
      {:else if icon === "cube"}
        <Cube {variant} />
      {:else if icon === "data"}
        <Data {variant} />
      {:else if icon === "list"}
        <List {variant} />
      {:else if icon === "widget"}
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
        <Play {variant} />
      {:else if icon === "play-circled"}
        <Play {variant} isCircled={true} />
      {:else if icon === "play-circled-mini"}
        <Play variant={IconVariant.Mini} isCircled={true} />
      {:else if icon === "plus"}
        <Add {variant} isCircled={true} />
      {:else if icon === "cross-circled"}
        <Cross {variant} isCircled={true} />
      {:else if icon === "cross"}
        <Cross {variant} isCircled={false} />
      {:else if icon === "trash"}
        <Trash {variant} />
      {:else if icon === "chatleftright"}
        <Chat {variant} chatIconVariant={ChatIconVariant.LeftRight} />
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
      {:else if icon === "arrow-left"}
        <Arrow direction={Direction.Left} />
      {:else if icon === "arrow-right"}
        <Arrow direction={Direction.Right} />
      {:else if icon === "arrow-right-circled"}
        <Arrow direction={Direction.Right} isCircled={true} />
      {:else if icon === "arrow-right-circled-mini"}
        <Arrow
          direction={Direction.Right}
          isCircled={true}
          variant={IconVariant.Mini}
        />
      {:else if icon === "arrow-right-mini"}
        <Arrow direction={Direction.Right} variant={IconVariant.Mini} />
      {:else if icon === "chevdoubleleft"}
        <ChevronDouble direction={Direction.Left} />
      {:else if icon === "chevdoubleright"}
        <ChevronDouble direction={Direction.Right} />
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
