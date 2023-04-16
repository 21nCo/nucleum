<script lang="ts">
    import { Size } from "$lib/tidy/types/size.enum";
    import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
    import { generateBackgroudColor } from "$lib/tidy/utils";
    import { createEventDispatcher, onMount } from "svelte";
    import Element from "../Element.svelte";
    export let item: string;
    export let size: Size;
    export let parentBackgroundIndex: number;
    export let isActive: boolean = false;
    export let selectionStyle: SelectionItemActiveStyle;
    let classList: string = "relative max-w-full";

    const dispatch = createEventDispatcher();
    function handleClick() {
        dispatch("click", { item });
    }
    $: selectionStyle =
        size === Size.sm ? SelectionItemActiveStyle.NONE : selectionStyle;
    onMount(() => {
        switch (size) {
            case Size.sm:
                classList += " py-1 px-4 rounded-full";
                break;
            case Size.md:
                classList += " px-4 py-2 rounded-md";
                break;
            case Size.lg:
                classList += " px-8 py-4 rounded-md text-lg";
                break;
            default:
                classList += " p-2";
                break;
        }
    });
</script>

<Element
    {classList}
    on:click={handleClick}
    {parentBackgroundIndex}
    {selectionStyle}
    {isActive}
>
    <div class="flex gap-2 items-center">
        {#if selectionStyle === SelectionItemActiveStyle.CIRCLE}
            <div
                class="relative rounded-lg outline outline-2 outline-fgs2 w-4 h-4"
            >
                {#if isActive}
                    <div
                        class="absolute w-2 h-2 left-1/4 top-1/4 bg-fgs2 rounded-full"
                    />
                {/if}
            </div>
        {/if}
        <div
            class="truncate text-left {selectionStyle ===
                SelectionItemActiveStyle.SIDEDOT && isActive
                ? 'text-accent1 text-b0'
                : ''} "
        >
            {item}
        </div>
    </div>
</Element>
