<!-- DraggableItem.svelte -->
<script lang="ts">
    import { dragAndDropStore } from "$lib/tidy/stores/stores";
    import { DragStatus } from "$lib/tidy/types/dragstatus.enum";
    export let item: any;
    export let classList: string;
    export let isDraggable: boolean = true;
    export let isDragging: boolean = false;

    const handleDragStart = () => {
        isDragging = true;
        dragAndDropStore.update((x: any) => {
            x = { ...x, dragStatus: DragStatus.STARTED, dragItem: item };
            return x;
        });
    };
    const handleDragEnter = () => {
        dragAndDropStore.update((x: any) => {
            x = { ...x, dragStatus: DragStatus.DRAGGING, dragEnterItem: item };
            return x;
        });
    };
    const handleDragEnd = () => {
        isDragging = false;
    };

    const handleDrop = () => {
        dragAndDropStore.update((x: any) => {
            x = { ...x, dragStatus: DragStatus.DROPPED, dropItem: item };
            return x;
        });
    };
    function onDragOver(event: any) {
        event?.preventDefault();
    }
</script>

<div
    class="{isDraggable ? 'cursor-move' : ''} {classList}"
    draggable={isDraggable}
    on:dragstart={handleDragStart}
    on:dragend={handleDragEnd}
    on:dragover={onDragOver}
    on:dragenter={handleDragEnter}
    on:drop={handleDrop}
    on:mouseenter
    on:mouseleave
>
    <slot />
</div>
