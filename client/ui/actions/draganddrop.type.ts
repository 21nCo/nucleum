import type { DragStatus } from "@21n/ui/actions/dragstatus.enum";

export type DragAndDrop = {
  dragItem: any;
  dragEnterItem: any;
  dragLeaveItem: any;
  dropItem: any;
  dragStatus: DragStatus;
  dragId: any;
  dragEnterId: any;
  dropId: any;
  forwardDrop?: boolean;
};
