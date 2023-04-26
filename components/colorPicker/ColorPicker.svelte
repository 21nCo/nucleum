<script lang="ts">
    import Button from "$lib/tidy/elements/Button.svelte";
    import { appStore, userPreferences } from "$lib/tidy/stores/stores";
    import { assignSatAndLight } from "$lib/tidy/utils";
    import { onMount } from "svelte";
    import ColorSlider from "./ColorSlider.svelte";
    export let hue = 0;
    export let isShowPreview: boolean = false;
    let saturation = 50;
    let lightness = 50;
    let isDark: boolean = false;
    $: isDark = $userPreferences.colorScheme.isDark;
    onMount(() => {
        let values = assignSatAndLight(
            $userPreferences,
            $appStore.appConstants.selectableColorParams
        );
        if (values) {
            saturation = values.saturation;
            lightness = values.lightness;
        }
    });
</script>

<div class="flex flex-col gap-2">
    <div>
        choose a color
    </div>
    <div class="flex flex-col gap-4 items-center justify-center">
        {#if isShowPreview}
            <div
                class="w-20 h-12 rounded-lg"
                style="background-color:hsl({hue}, {saturation}%, {lightness}%)"
            />
        {/if}
        <ColorSlider bind:hue {saturation} {lightness} />
        {#if $appStore.isDebug}
            <Button
                label={isDark ? "Dark" : "Light"}
                on:click={() => {
                    isDark = !isDark;
                }}
            />
        {/if}
    </div>
    
</div>
