export interface DbRecordBase {
  id?: string;
  createdAt?: number;
  modifiedAt?: number;
}

export interface DbRecordWithLabel extends DbRecordBase {
  label: string;
}
