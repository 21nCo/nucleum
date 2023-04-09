<script lang="ts">
    import DatePicker from "$lib/tidy/shared/elements/DatePicker.svelte";
    import TextInput from "$lib/tidy/shared/elements/TextInput.svelte";
    import {
        appEvents,
        appStore,
        userPreferences,
        windowObject,
    } from "$lib/tidy/stores/stores";
    import { onMount } from "svelte";
    import Switcher from "$lib/tidy/shared/MenuSwitcher.svelte";
    import type { ColorScheme } from "$lib/tidy/types/appConstants.type";
    import { Size } from "$lib/tidy/types/size.enum";
    import { SwitcherStyle } from "$lib/tidy/types/switcher.enum";
    import Button from "$lib/tidy/shared/elements/Button.svelte";
    import { EventType } from "$lib/tidy/types/event.enum";
    import { goto } from "$app/navigation";
    import ColorSchemeSwitcher from "./ColorSchemeSwitcher.svelte";
    export let parentBackgroundIndex: number = 1;
    export let isInPreviewMode: boolean = false;
    let selectedThemeIndex: number = 0;
    let selectedColorSchemeIndex: number;
    let selectedLightnessIndex: number;
    let filteredColorSchemes: ColorScheme[] = [];
    let colorSchemeLabels: string[] = [];
    let changesFeedback = "";
    $: colorSchemeLabels = filteredColorSchemes.map((x: ColorScheme) => {
        return x.label;
    });
    let backgroundColor = "";
    $: {
        if (parentBackgroundIndex === 1) {
            backgroundColor = " bg-bgs2";
        } else if (parentBackgroundIndex === 2) {
            backgroundColor = " bg-bgs3";
        } else if (parentBackgroundIndex === 0) {
            backgroundColor = " bg-bgs1";
        }
    }
    onMount(() => {
        selectedLightnessIndex = $userPreferences.colorScheme?.isDark ? 1 : 0;
        refreshColorSchemes();
    });
    function onDateChange(event: any) {
        $userPreferences.birthday = event.detail.date;
    }
    function refreshColorSchemes(e: any = undefined) {
        filteredColorSchemes = $appStore.appConstants.colorSchemes.filter(
            (x: ColorScheme) => {
                return (
                    (selectedLightnessIndex == 0 && !x.isDark) ||
                    (selectedLightnessIndex == 1 && x.isDark)
                );
            }
        );
        if (e) {
            selectedColorSchemeIndex = 0;
            saveColorScheme();
        } else {
            selectedColorSchemeIndex = filteredColorSchemes.findIndex(
                (x: any) => {
                    return x.label === $userPreferences.colorScheme.label;
                }
            );
        }
    }
    function saveColorScheme() {
        $userPreferences.colorScheme =
            selectedColorSchemeIndex != undefined
                ? filteredColorSchemes[selectedColorSchemeIndex]
                : $userPreferences.colorScheme;
        showChangesFeedback();
    }
    function saveTheme() {
        $userPreferences.theme =
            selectedThemeIndex != undefined
                ? $appStore.appConstants.themes[selectedThemeIndex]
                : $userPreferences.theme;
        console.log($userPreferences);
        showChangesFeedback();
    }
    function showChangesFeedback() {
        changesFeedback = "All changes saved";
        setTimeout(() => {
            changesFeedback = "";
        }, 1500);
    }
    function onThemeChange() {
        console.log("onThemeChange");
        refreshColorSchemes();
        saveTheme();
    }
</script>

<div class="flex flex-col gap-8 w-full">
    {#if isInPreviewMode}
        <div class="text-xs text-center text-texts3 h-1">
            {changesFeedback ? changesFeedback : ""}
        </div>
    {:else}
        <div>
            <Button
                on:click={() => {
                    appEvents.notify(EventType.SHOW_APPEARANCE_PREVIEW, true);
                    goto("/");
                }}
                label="Open Preview Mode"
            />
        </div>
    {/if}

    <div class="flex flex-col gap-1 w-full">
        <div class="text-texts2 text-h2">App mode</div>
        <Switcher
            {parentBackgroundIndex}
            items={$appStore.appConstants.appModes}
            bind:selected={$userPreferences.appMode}
        />
    </div>
    <div class="flex flex-col gap-6 w-full">
        <div>
            <div class="text-texts2 text-h2">Theme</div>
            <Switcher
                {parentBackgroundIndex}
                items={$appStore.appConstants.themes}
                style={SwitcherStyle.Vertical}
                on:switch={onThemeChange}
                bind:selected={selectedThemeIndex}
            />
        </div>
        <div class="flex flex-col gap-4 w-full">
            <div class="flex flex-col gap-2">
                <div class="text-texts2">Color scheme</div>
                <Switcher
                    {parentBackgroundIndex}
                    items={["light", "dark", "system"]}
                    size={Size.sm}
                    on:switch={refreshColorSchemes}
                    bind:selected={selectedLightnessIndex}
                />
            </div>
            <ColorSchemeSwitcher
                {parentBackgroundIndex}
                colorSchemes={filteredColorSchemes}
                bind:selected={selectedColorSchemeIndex}
                on:switch={saveColorScheme}
            />
        </div>
    </div>
    <div class="flex flex-col gap-1">
        <TextInput
            label="Nickname"
            bind:value={$userPreferences.nickName}
            placeholder="nickname"
            {backgroundColor}
        />
    </div>
    <!-- <div class="flex gap-8">
        <CheckboxInput
            label="Enable Age Counter"
            bind:checked={$userPreferences.isEnableAgeCounter}
        />
    </div> -->
    {#if $userPreferences.isEnableAgeCounter}
        <div class="flex flex-col gap-1">
            <div class="text-texts2">Birthday</div>
            <div>
                <DatePicker
                    date={new Date($userPreferences.birthday ?? new Date())}
                    on:change={onDateChange}
                />
            </div>
        </div>
    {/if}
</div>
