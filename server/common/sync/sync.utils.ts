import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";

export function resolveSyncDownQuery(
  lastSyncDown: number,
  resources: Resource[],
  dapId: string,
  limit?: number
) {
  const syncDownLimit = limit || 100;
  const resourceList = resources.map((x) => `'${x}'`).join(",");
  return `BEGIN TRANSACTION; let $count = array::first(SELECT count() FROM mutation WHERE timestamp > ${lastSyncDown} AND dapId IS NOT '${dapId}' AND resource IN [${resourceList}] group all); RETURN IF $count.count < ${syncDownLimit} THEN SELECT * FROM mutation WHERE timestamp > ${lastSyncDown} AND dapId IS NOT '${dapId}' AND resource IN [${resourceList}] ORDER BY timestamp ASC ELSE $count.count END; COMMIT TRANSACTION;`;
}

export function resolveCountQuery(resources: Resource[]) {
  let query = "";
  for (const resource of resources) {
    query += `array::first(select count() as ${resource} from ${resource} group all);`;
  }
  return query;
}

export function resolveCloneDownQuery(
  resources: Resource[],
  params?: {
    isExtension?: boolean;
    limit?: number;
  }
) {
  const cloneDownLimit = params?.limit || 1000;
  let query = "";
  if (!params?.isExtension) {
    resources.forEach((resource) => {
      query += `select *, meta::id(id) as id from ${resource} LIMIT ${cloneDownLimit};`;
    });
  } else {
    resources.forEach((resource) => {
      query += `select * from ${resource} LIMIT ${cloneDownLimit};`;
    });
  }
  return query;
}
