import type { IDataMapper } from "./flux.type";
import { Resource } from "./resourceStores/resource.enum";

/**
 * DataMapper service handles data transformation operations such as:
 * - Date parsing from strings to Date objects
 * - Data decryption (if needed in future)
 * - Other data format transformations
 */
export class DataMapper implements IDataMapper {
  private encryptionFieldsMap: Record<Resource, string[]>;

  constructor(encryptionFieldsMap: Record<Resource, string[]>) {
    this.encryptionFieldsMap = encryptionFieldsMap;
  }
  /**
   * Maps raw data records to properly typed objects with date parsing
   * @param resource The resource type being processed
   * @param records Array of raw records to transform
   * @returns Transformed records with proper data types
   */
  parse(resource: Resource, records: any[]): any[] {
    return records.map((record) => this.mapRecord(resource, record));
  }

  encrypt(resource: Resource, records: any[]): any[] {
    //TODO - encrypt
    return records;
  }

  /**
   * Transforms a single record with proper data type conversions
   * @param resource The resource type being processed
   * @param record Raw record to transform
   * @returns Transformed record with proper data types
   */
  private mapRecord(resource: Resource, record: any): any {
    //TODO - decrypt
    return {
      ...record,
      ...this.mapDateFields(record),
      id: record.id.includes(":") ? record.id : `${resource}:${record.id}`
    };
  }

  /**
   * Transforms date string fields to Date objects
   * @param record Record containing potential date fields
   * @returns Object with transformed date fields
   */
  private mapDateFields(record: any): Partial<any> {
    const dateFields: Partial<any> = {};

    if (record.createdAt) {
      dateFields.createdAt = new Date(record.createdAt);
    }
    if (record.modifiedAt) {
      dateFields.modifiedAt = new Date(record.modifiedAt);
    }
    if (record.date) {
      dateFields.date = new Date(record.date);
    }
    if (record.startDate) {
      dateFields.startDate = new Date(record.startDate);
    }
    if (record.endDate) {
      dateFields.endDate = new Date(record.endDate);
    }

    return dateFields;
  }

  /**
   * Future extension point for resource-specific transformations
   * @param resource The resource type
   * @param record The record to transform
   * @returns Resource-specific transformations
   */
  private decrypt(resource: Resource, record: any): any {
    switch (resource) {
      // Add resource-specific transformations here as needed
      default:
        return {};
    }
  }
}
