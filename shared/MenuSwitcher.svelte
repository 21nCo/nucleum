<script lang="ts">
    import { Size } from "$lib/tidy/types/size.enum";
    import {
        SelectionItemActiveStyle,
        SwitcherStyle,
    } from "$lib/tidy/types/switcher.enum";
    import { createEventDispatcher, onMount } from "svelte";
    import MenuItem from "./MenuItem.svelte";
    const dispatch = createEventDispatcher();
    export let items: string[];
    export let selected: number;
    export let size: Size = Size.md;
    export let selectionStyle: SelectionItemActiveStyle =
        SelectionItemActiveStyle.UNKNOWN;
    export let parentBackgroundIndex: number = 1;
    export let style: SwitcherStyle = SwitcherStyle.HorizontalAndWraps;
    let classList: string;
    function handleClick(event: any) {
        let selectedMenuItem = event.detail.item;
        selected = items.indexOf(selectedMenuItem!);
        dispatch("switch", { selected });
    }
    onMount(() => {
        switch (style) {
            case SwitcherStyle.Vertical:
                classList = "flex flex-col gap-2";
                selectionStyle =
                    selectionStyle === SelectionItemActiveStyle.UNKNOWN
                        ? SelectionItemActiveStyle.CIRCLE
                        : selectionStyle;
                break;
            case SwitcherStyle.Horizontal:
                classList = "flex overflow-auto w-full pb-2";
                selectionStyle =
                    selectionStyle === SelectionItemActiveStyle.UNKNOWN
                        ? SelectionItemActiveStyle.SIDEBAR
                        : selectionStyle;
                break;
            case SwitcherStyle.HorizontalAndWraps:
                classList = "flex gap-2 flex-wrap w-full pb-2";
                selectionStyle =
                    selectionStyle === SelectionItemActiveStyle.UNKNOWN
                        ? SelectionItemActiveStyle.SIDEBAR
                        : selectionStyle;
                break;
            default:
        }
    });
</script>

<div class={classList}>
    {#each items as item, index}
        <MenuItem
            {selectionStyle}
            {parentBackgroundIndex}
            {size}
            {item}
            isActive={selected === index}
            on:click={handleClick}
        />
    {/each}
</div>
