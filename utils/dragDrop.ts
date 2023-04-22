import type { DragAndDrop } from "../types/draganddrop.type";
import { DragStatus } from "../types/dragstatus.enum";

export function handleDragNDrop(x: DragAndDrop, items: any, listId: any) {
    if (
        x.dragStatus == DragStatus.DROPPED &&
        x.dragItem &&
        x.dropItem &&
        (x.dropItem.listId == listId || x.dragItem.listId == listId)
    ) {
        let draggedItem = x.dragItem;
        let targetItem = x.dropItem;
        if (
            !draggedItem ||
            !targetItem ||
            draggedItem.task.id === targetItem.task.id
        ) {
            return;
        }
        let draggedIndex = -1;
        let targetIndex = -1;
        if (
            draggedItem.listId == listId
        ) {
            draggedIndex = items.indexOf(draggedItem.task);
        }
        if (
            targetItem.listId == listId
        ) {
            targetIndex = items.indexOf(targetItem.task);
        }
        if (
            draggedIndex >= 0 &&
            targetIndex >= 0 &&
            targetIndex < items.length
        ) {
            items = [
                ...items.slice(0, draggedIndex),
                ...items.slice(draggedIndex + 1),
            ];
            items.splice(targetIndex, 0, draggedItem.task);
        }
    }
    if (x.dragStatus == DragStatus.STARTED && x.dragItem) {
        //todo - remove dragged item from list
    }
    if (x.dragItem && x.dragEnterItem) {
    }
    return items;
}