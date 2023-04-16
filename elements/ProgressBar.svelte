<script lang="ts">
    import { Size } from "$lib/tidy/types/size.enum";
    import Element from "$lib/tidy/elements/Element.svelte";
    import { onMount } from "svelte";
    export let progress: number = 0;
    export let size: Size = Size.md;
    let sizeClasses: string = "";
    onMount(() => {
        switch (size) {
            case Size.xxs:
            case Size.xs:
            case Size.sm:
                sizeClasses = "h-1";
                break;
            case Size.md:
                sizeClasses = "h-2";
                break;
            case Size.lg:
            case Size.xl:
            case Size.xxl:
                sizeClasses = "h-3";
                break;
        }
    });
</script>

<div class="relative w-full rounded-full overflow-hidden mb-1 {sizeClasses}">
    <Element isAction={false} classList="absolute w-full h-full bg-bgs4" />
    <!-- <div class="absolute bg-bgs3 w-full h-full" /> -->
    <div
        class="relative z-10 h-full bg-accent1 rounded-full"
        style="width: {progress * 100}%"
    />
</div>
