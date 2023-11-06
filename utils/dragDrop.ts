import type { DragAndDrop } from "../types/draganddrop.type";
import { DragStatus } from "../types/dragstatus.enum";

export function handleDragNDropForMultiList(
  x: DragAndDrop,
  items: any[],
  listId: any
) {
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
    if (draggedItem.listId == listId) {
      draggedIndex = items.indexOf(draggedItem.task);
    }
    if (targetItem.listId == listId) {
      targetIndex = items.indexOf(targetItem.task);
    }
    if (draggedIndex >= 0 && targetIndex >= 0 && targetIndex < items.length) {
      items = [
        ...items.slice(0, draggedIndex),
        ...items.slice(draggedIndex + 1),
      ];
      items.splice(targetIndex, 0, draggedItem.task);
    }
    items.forEach((item: any, index) => {
      item.order = index;
    });
    return items;
  }
  if (x.dragStatus == DragStatus.STARTED && x.dragItem) {
    //todo - remove dragged item from list
  }
  if (x.dragItem && x.dragEnterItem) {
  }
  return null;
}

export function handleDragNDrop(x: DragAndDrop, items: any[]) {
  if (x.dragStatus == DragStatus.DROPPED && x.dragItem && x.dropItem) {
    items = items.filter(
      (item) => item.order != x.dragItem.order && item.order != x.dropItem.order
    );
    let draggedItem = x.dragItem;
    draggedItem.order = x.dropItem.order;
    x.dropItem.order = x.dragItem.order;
    items = items.concat([draggedItem, x.dropItem]);
    return items;
  }
  if (x.dragStatus == DragStatus.STARTED && x.dragItem) {
    //todo - remove dragged item from list
  }
  if (x.dragItem && x.dragEnterItem) {
  }
  return null;
}
