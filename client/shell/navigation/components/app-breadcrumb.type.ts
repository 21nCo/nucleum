import type { IRecordId } from "@nucleum/schema/legacy/data.type";

/** Describes navigation metadata consumed by the application breadcrumb adapter. */
export type IAppBreadcrumbItem = {
  label: string;
  path?: string;
  resourceId?: IRecordId;
  disabled?: boolean;
  id?: string;
};
