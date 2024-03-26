import { PersistanceActionType, StoreDataType } from "../types/data.type";

/**
 * This is uniform with Surreal time::unix() - for cache invalidation etc
 * @returns current timestamp in unix
 */
export function currentUnixTimestamp() {
  return +(new Date().getTime() / 1000).toFixed();
}

export function resolveRefreshQuery(id: string, dataType: StoreDataType) {
  if (dataType === StoreDataType.KVO)
    return `array::first(select * from ${id});`;
  else if (dataType === StoreDataType.FIR) return `select * from ${id};`;
}

function mutationMapEntry(recordId: string) {
  const tb = recordId.includes(":") ? recordId.split(":")[0] : recordId;
  return `;update kv:mutationMap set ${tb} = ${+(
    new Date().getTime() / 1000
  ).toFixed()};`;
}

export function resolveMutationQuery(
  type: PersistanceActionType,
  record: string
) {
  let modifiedQuery: string = "";
  switch (type) {
    case PersistanceActionType.DELETE:
      modifiedQuery = `DELETE ${record};`;
      break;
    case PersistanceActionType.INSERT:
      modifiedQuery = `INSERT INTO ${record} $data RETURN id;`;
      break;
    case PersistanceActionType.UPDATE:
      modifiedQuery = `UPDATE ${record} CONTENT $data;`;
      break;
    case PersistanceActionType.CREATE:
      modifiedQuery = `create ${record} content $data return id;`;
      break;
    case PersistanceActionType.MERGE:
      modifiedQuery = `UPDATE ${record} MERGE $data;`;
      break;
  }
  return modifiedQuery + mutationMapEntry(record);
}

export function replaceParams(query: string, params: any) {
  // if (params) {
  //   for (const key in params) {
  //     query = query.replace(new RegExp(`\\$${key}`, "g"), params[key]);
  //   }
  // }
  for (const key in params) {
    let replaceWith;
    if (typeof params[key] === "object")
      replaceWith = JSON.stringify(params[key]);
    else if (typeof params[key] === "string") replaceWith = `"${params[key]}"`;
    else replaceWith = params[key];
    query = query.replaceAll("$" + key, `${replaceWith}`);
  }
  return query;
}
