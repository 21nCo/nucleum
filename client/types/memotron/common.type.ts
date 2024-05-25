export interface MemotronItemBase {
  id: string;
  label: string;
  isStarred?: boolean;
  isArchived?: boolean;
  trashInformation?: TrashInformation;
  createdAt: string;
  modifiedAt: string;
  createdBy: string;
  modifiedBy: string;
}

export interface TrashInformation {
  deletedAt: string;
  deletedBy: string;
}
