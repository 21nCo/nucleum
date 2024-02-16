export interface DbRecordBase {
  id?: string | number;
  created?: string;
  modified?: string;
}

export interface DbRecordWithLabel extends DbRecordBase {
  label: string;
}
