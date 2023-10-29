export interface DbRecordBase {
  id: string | number;
  created?: string;
}

export interface DbRecordWithLabel extends DbRecordBase {
  label: string;
}
