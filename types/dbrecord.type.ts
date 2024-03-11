export interface DbRecordBase {
  id?: string | number;
  createdAt?: number;
  modifiedAt?: number;
}

export interface DbRecordWithLabel extends DbRecordBase {
  label: string;
}
