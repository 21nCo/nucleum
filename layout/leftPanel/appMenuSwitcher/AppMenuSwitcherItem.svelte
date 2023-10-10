<script lang="ts">
  import { page } from "$app/stores";
  import { LayoutContext } from "$lib/tidy/types/layout.type";
  import { createEventDispatcher } from "svelte";
  import Element from "../../../elements/Element.svelte";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { windowObject } from "$lib/tidy/stores/app.store";
  import type { ComponentType } from "$lib/tidy/types/component.type";
  import { Size } from "$lib/tidy/types/size.enum";
  const dispatch = createEventDispatcher();
  export let item: ComponentType;
  export let style: LayoutContext = LayoutContext.DEFAULT;
  $: isActive =
    $page.params.route?.includes(item.path) ||
    $page.route.id?.includes(item.path);
  export let isShowLabel: boolean = true;
  export let parentBackgroundIndex: number;
  let pad: number;
  let rive: any;
  $: if ($windowObject.documentHeight) {
    let rawPad = ($windowObject.documentWidth / 10) * $windowObject.scale;
    pad = rawPad > 30 ? 30 : rawPad;
  }
  function onClick() {
    rive?.fire();
    dispatch("click", {});
  }
  function onHover() {
    rive?.fire();
  }
</script>

<Element
  classList="flex items-center {isShowLabel
    ? style === LayoutContext.PORTRAIT
      ? 'flex-col gap-1 text-b4 rounded-lg'
      : 'text-b2 gap-3 rounded-lg p-3 h-10'
    : 'p-4 rounded-full'}"
  {isActive}
  on:click={onClick}
  on:pointerenter={onHover}
  {parentBackgroundIndex}
  hoverStyle={!$windowObject.isInPortraitMode
    ? SelectionItemActiveStyle.BG_COLOR
    : SelectionItemActiveStyle.NONE}
  selectionStyle={style === LayoutContext.PORTRAIT ||
  style === LayoutContext.THIN
    ? SelectionItemActiveStyle.ACCENT_COLOR
    : SelectionItemActiveStyle.ACCENT_BACKGROUND}
>
  {#if item.icon}
    <!-- <RiveAnimatedIcon icon={item.icon ?? ""} bind:this={rive} /> -->
    <div class="w-6 flex justify-center">
      <Icon
        icon={item.icon}
        {isActive}
        size={Size.md}
        selectionStyle={style === LayoutContext.PORTRAIT ||
        style === LayoutContext.THIN
          ? SelectionItemActiveStyle.ACCENT_COLOR
          : SelectionItemActiveStyle.NONE}
      />
    </div>
  {/if}
  {#if isShowLabel}
    {item.label}
  {/if}
</Element>
