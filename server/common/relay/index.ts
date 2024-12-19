import { FluxMethod, IFluxMethod } from "$lib/client/components/flux/flux.type";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { IRecordId, IResourceSelectParams } from "$lib/client/types/data.type";
import { Agent } from "$lib/server/common/account/account.type";
import {
  resolveSelectManyQuery,
  resolveSelectQuery
} from "$lib/shared/utils/surreal.utils";
import { ValidationError } from "../errors";
import { performQueryOnBehalfOfUser } from "../user/user";

export function relay(body: IFluxMethod, agent: Agent) {
  switch (body.method) {
    case FluxMethod.SELECT_MANY:
      const { resource, params } = body.args;
      if (!resource) {
        throw new ValidationError("resource is required");
      }
      return selectMany(agent, resource, params);
    case FluxMethod.SELECT:
      const { resourceId, properties } = body.args;
      if (!resourceId) {
        throw new ValidationError("resourceId is required");
      }
      return select(agent, resourceId, properties);
    default:
      return {
        statusCode: 400,
        body: "Method not found"
      };
  }
}

function selectMany(
  agent: Agent,
  resource: Resource,
  params?: IResourceSelectParams
) {
  const query = resolveSelectManyQuery(resource, params);
  return performQueryOnBehalfOfUser(query, agent);
}

function select(agent: Agent, resourceId: IRecordId, properties?: string[]) {
  const query = resolveSelectQuery(resourceId, properties);
  return performQueryOnBehalfOfUser(query, agent);
}
