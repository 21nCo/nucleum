<script lang="ts">
    import { userPreferences } from "$lib/tidy/stores/stores";
    import { onMount } from "svelte";
    import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
    import { generateBackgroudColor } from "$lib/tidy/utils";
    export let classList: string;
    export let isAction: boolean = true;
    //export let isMenuItem: boolean = false;
    export let isActive: boolean = false;
    export let selectionStyle: SelectionItemActiveStyle =
        SelectionItemActiveStyle.NONE;
    export let parentBackgroundIndex: number = 1;
    let activeBackgroundColor: string;
    let backgroundColor: string;
    onMount(() => {
        let colors = generateBackgroudColor(parentBackgroundIndex);
        activeBackgroundColor = colors.activeBackgroundColor;
        backgroundColor = colors.backgroundColor;
        if (selectionStyle === SelectionItemActiveStyle.SIDEDOT) {
            activeBackgroundColor = "";
        }
    });
</script>

{#if isAction}
    <button
        class={classList +
            ($userPreferences.theme == "Colorful"
                ? selectionStyle != SelectionItemActiveStyle.SIDEDOT
                    ? isActive
                        ? selectionStyle === SelectionItemActiveStyle.ACCENT
                            ? " bg-accent1 text-bgs1"
                            : " glassactive"
                        : selectionStyle === SelectionItemActiveStyle.ACCENT
                        ? ""
                        : " glass"
                    : ""
                : $userPreferences.theme == "Clean"
                ? isActive
                    ? selectionStyle === SelectionItemActiveStyle.ACCENT
                        ? " bg-accent1 text-bgs1"
                        : activeBackgroundColor
                    : selectionStyle === SelectionItemActiveStyle.ACCENT
                    ? ""
                    : backgroundColor + " hover:" + activeBackgroundColor?.trim()
                : "")}
        on:click
        on:pointerenter
    >
        <slot />
        {#if selectionStyle === SelectionItemActiveStyle.SIDEBAR && isActive}
            <div
                class="absolute w-0.5 opacity-80 h-3/4 bg-fgs2 rounded-md"
                style=" top: 12.5%; left: -2px"
            />
        {:else if selectionStyle === SelectionItemActiveStyle.SIDEDOT && isActive}
            <div
                class="absolute opacity-80 w-2 rounded-full bg-accent1"
                style="height: 20%; top: 40%; left: -2px"
            />
        {/if}
    </button>
{:else}
    <div
        class={classList +
            (classList.includes("bg-")
                ? ""
                : $userPreferences.theme == "Colorful"
                ? " glassactive"
                : backgroundColor)}
    >
        <slot />
    </div>
{/if}

<style>
    .glass {
        background: rgba(180, 180, 191, 0.2);
        /* border: 1px solid white; */
        backdrop-filter: blur(5px);
    }
    .glassactive {
        background: rgba(218, 218, 228, 0.2);
        /* border: 1px solid white; */
        backdrop-filter: blur(25px);
    }
</style>
