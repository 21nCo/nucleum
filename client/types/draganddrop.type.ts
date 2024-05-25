import type { DragStatus } from "./dragstatus.enum";

export type DragAndDrop = {
  dragItem: any;
  dragEnterItem: any;
  dropItem: any;
  dragStatus: DragStatus;
  dragId: any;
  dragEnterId: any;
  dropId: any;
};
