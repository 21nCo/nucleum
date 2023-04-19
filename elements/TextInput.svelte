<script lang="ts">
    import { Size } from "$lib/tidy/types/size.enum";
    import { TextInputStyle } from "$lib/tidy/types/textinput.enum";

    import { createEventDispatcher, onMount } from "svelte";
    import { generateBackgroudColor } from "$lib/tidy/utils";
    export let value: any;
    export let label: string | undefined = undefined;
    export let placeholder: string | undefined = undefined;
    export let units: string[] | undefined = undefined;
    export let style: TextInputStyle = TextInputStyle.BOXED;
    export let size: Size = Size.xl;
    export let parentBackgroundIndex: number = 1;
    let backgroundColor: string;
    export let isDisabled = false;
    let inputClasses: string = "text-input w-full rounded-sm";
    let unitClasses: string = "outline outline-bgs2 outline-2 rounded-sm";
    let currentUnit: string | undefined = undefined;
    const dispatch = createEventDispatcher();
    onMount(() => {
        if (!currentUnit) currentUnit = units ? units[0] : "";
        if (style == TextInputStyle.PLAIN) {
            inputClasses += " bg-transparent";
        } else {
            let colors = generateBackgroudColor(parentBackgroundIndex);
            backgroundColor = colors.backgroundColor;
            inputClasses += ` bg-${backgroundColor} outline outline-bgs2 outline-2 p-2`;
            unitClasses = unitClasses + " p-2";
        }
        if (style == TextInputStyle.BOXED && units && units.length > 0) {
            inputClasses += " rounded-r-none";
            unitClasses = unitClasses + " rounded-l-none";
        } else if (style === TextInputStyle.BOXED) {
            inputClasses += " focus:outline-accent1";
        } else {
            inputClasses += " focus:border-none focus:outline-none";
        }
        if (size == Size.xl) inputClasses += " text-h2";
        else if (size == Size.lg) inputClasses += " text-lg";
        else if (size == Size.md) inputClasses += " text-md";
        else if (size == Size.sm) inputClasses += " text-b2";
        else if (size == Size.xs) inputClasses += " text-xs";
    });
    function onUnitClick() {
        if (units?.length == 2) {
            if (currentUnit == units[0]) currentUnit = units[1];
            else currentUnit = units[0];
        }
        //todo - if more than 2 units - show dropdown
        dispatch("unitChange", { unit: currentUnit });
    }
</script>

<div class="flex flex-col gap-1">
    {#if label}
        <div class="text-fgs2">{label}</div>
    {/if}
    <div class="flex items-center">
        <input
            class={inputClasses}
            bind:value
            on:change
            on:keydown
            on:blur
            on:focus
            {placeholder}
            disabled={isDisabled}
        />
        {#if units}
            <div class={unitClasses}>
                <button on:click={onUnitClick}>
                    {currentUnit}
                </button>
            </div>
        {/if}
        <div class="ml-4">
            <slot />
        </div>
    </div>
</div>

<!-- placeholder={placeholder ?? ""} -->
