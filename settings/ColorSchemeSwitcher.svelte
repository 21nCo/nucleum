<script lang="ts">
    import type { ColorScheme } from "$lib/tidy/types/appConstants.type";
    import { generateBackgroudColor, generateUID } from "$lib/tidy/utils";
    import { createEventDispatcher, onMount } from "svelte";
    export let colorSchemes: ColorScheme[];
    export let parentBackgroundIndex: number;
    export let selected: number;
    let classList: string =
        "relative flex flex-col items-center gap-1 p-2 rounded-md";
    let activeBackgroundColor: string;
    let backgroundColor: string;
    const dispatch = createEventDispatcher();
    onMount(() => {
        let colors = generateBackgroudColor(parentBackgroundIndex);
        activeBackgroundColor = colors.activeBackgroundColor;
        backgroundColor = colors.backgroundColor;
    });
    function getColors(colorScheme: ColorScheme) {
        return [
            colorScheme.bgs1 ?? "",
            colorScheme.bgs2 ?? "",
            colorScheme.bgs3 ?? "",
            colorScheme.accent1 ?? "",
            colorScheme.accent2 ?? "",
        ];
    }
    function onClicked(index: number) {
        selected = index;
        dispatch("switch", { selected });
    }
</script>

<div class="flex flex-wrap gap-4">
    {#each colorSchemes as colorScheme, index}
        <button
            on:click={() => {
                onClicked(index);
            }}
            class={classList +
                (selected === index ? activeBackgroundColor : backgroundColor)}
        >
            {#if getColors(colorScheme)}
                <div class="flex">
                    {#each getColors(colorScheme) as color, colorIndex}
                        <div
                            class="w-5 h-5 {colorIndex === 0
                                ? 'rounded-l'
                                : colorIndex ===
                                  getColors(colorScheme).length - 1
                                ? 'rounded-r'
                                : ''}"
                            style="background-color: {color}"
                        />
                    {/each}
                </div>
            {/if}
            {colorScheme.label}
            {#if selected === index}
                <div
                    class="active-marker absolute border-2 inset-0 left-0 top-0 rounded-lg border-texts3"
                />
            {/if}
        </button>
    {/each}
</div>

<style>
    .active-marker {
        height: calc(100% + 8px);
        width: calc(100% + 8px);
        margin: -4px;
    }
</style>
