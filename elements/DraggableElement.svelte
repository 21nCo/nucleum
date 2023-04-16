<!-- DraggableItem.svelte -->
<script lang="ts">
    import { dragAndDropStore } from "$lib/tidy/stores/stores";
    import { DragStatus } from "$lib/tidy/types/dragstatus.enum";
    export let item: any;
    export let classList: string;

    const handleDragStart = () => {
        console.log("drag started", item);
        dragAndDropStore.update((x: any) => {
            x = { ...x, dragStatus: DragStatus.STARTED, dragItem: item };
            return x;
        });
    };
    const handleDragEnter = () => {
        console.log("drag entered", item);
        dragAndDropStore.update((x: any) => {
            x = { ...x, dragStatus: DragStatus.DRAGGING, dragEnterItem: item };
            return x;
        });
    };
    const handleDragEnd = () => {};

    const handleDrop = () => {
        console.log("dropped", item);
        dragAndDropStore.update((x: any) => {
            x = { ...x, dragStatus: DragStatus.DROPPED, dropItem: item };
            return x;
        });
    };
    function onDragOver(event: any) {
        //console.log({ event });
        event?.preventDefault();
    }
</script>

<div
    class="cursor-move {classList}"
    draggable="true"
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
