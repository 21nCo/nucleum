export interface IMemotronItemBase {
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

/**
 * @deprecated - Use ITrashInformation from resource.type.ts instead
 */
export interface TrashInformation {
  deletedAt: string;
  deletedBy: string;
}
