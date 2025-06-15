import { FluxMethod, IFluxMethod } from "$lib/client/components/flux/flux.type";
import { Agent } from "$lib/server/common/account/account.type";

import { ValidationError } from "../errors";
import { SyncProviderFactory } from "../sync/providers";

export function relay(body: IFluxMethod, agent: Agent) {
  const provider = SyncProviderFactory.getProvider();
  switch (body.method) {
    case FluxMethod.SELECT_MANY:
      const { resource, params } = body.args;
      if (!resource) {
        throw new ValidationError("resource is required");
      }
      return provider.selectMany(agent, resource, params);
    case FluxMethod.SELECT:
      const { resourceId, properties } = body.args;
      if (!resourceId) {
        throw new ValidationError("resourceId is required");
      }
      return provider.select(agent, resourceId, properties);
    default:
      return {
        statusCode: 400,
        body: "Method not found"
      };
  }
}
