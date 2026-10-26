import type { Resource } from "@nucleum/schema/resource.enum";
import type {
  IRecordId,
  IResourceSelectParams,
  IResourceSelectProperties
} from "@nucleum/schema/legacy/data.type";

/** Operations still accepted by the legacy relay endpoint. */
export enum FluxMethod {
  SELECT_MANY = "selectMany",
  SELECT = "select"
}

/** Request payload accepted by the legacy relay endpoint. */
export type IFluxMethod =
  | {
      method: FluxMethod.SELECT_MANY;
      args: {
        resource: Resource;
        params?: IResourceSelectParams;
      };
    }
  | {
      method: FluxMethod.SELECT;
      args: {
        resourceId: IRecordId;
        properties?: IResourceSelectProperties;
      };
    };
