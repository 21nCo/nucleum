import type { QueryParams } from "@21n/types/persistance.type";

export interface ISurrealDatabase {
  token: string | null;
  db: string | undefined;
  surreal: any;
  create(recordId: string, data: any): Promise<any>;
  insert(tableName: string, data: any[]): Promise<any>;
  merge(recordId: string, data: any): Promise<any>;
  update(recordId: string, data: any): Promise<any>;
  select(recordId: string): Promise<any>;
  delete(recordId: string, userId?: string): Promise<any>;
  executeReadFn(
    query: string,
    params: { [key: string]: QueryParams }
  ): Promise<any>;
  query(query: string, params: { [key: string]: QueryParams }): Promise<any>;
}
