import {
  PersistenceActionType,
  StoreDataType
} from "$lib/client/types/data.type";

/**
 * This is uniform with Surreal time::unix() - for cache invalidation etc
 * @returns current timestamp in unix
 */
export function surrealUnixTimestamp(date?: string | Date) {
  if (!date) return +(new Date().getTime() / 1000).toFixed();
  return +(new Date(date).getTime() / 1000).toFixed();
}

export function resolveRefreshQuery(
  id: string,
  dataType: StoreDataType,
  params?: {
    isFetchAll?: boolean;
  }
) {
  if (dataType === StoreDataType.KVO)
    return `array::first(select * from kv:${id});`;
  else if (dataType === StoreDataType.FIR) return `select * from ${id};`;
  else if (dataType === StoreDataType.IFR) {
    return `fn::global::resource::fetch("${id}", $since);`;
  }
}

function mutationMapEntry(recordId: string) {
  const tb = recordId.includes(":") ? recordId.split(":")[0] : recordId;
  return `;update kv:mutationMap set ${tb} = ${+(
    new Date().getTime() / 1000
  ).toFixed()};`;
}

export function resolveMutationQuery(
  type: PersistenceActionType,
  record: string,
  params?: { userId?: string; isPreventMutationMapEntry?: boolean }
) {
  let modifiedQuery: string = "";
  switch (type) {
    //TODO - use REMOVE or DELETE for removing the record permanently as trash is separated out and this surreal fn is not used for that
    case PersistenceActionType.DELETE:
      modifiedQuery = `return fn::global::resource::delete(${record}, ${params?.userId});`;
      break;
    case PersistenceActionType.INSERT:
      modifiedQuery = `INSERT INTO ${record} $data RETURN id;`;
      break;
    case PersistenceActionType.REPLACE:
      modifiedQuery = `UPDATE ${record} CONTENT $data;`;
      break;
    case PersistenceActionType.CREATE:
      modifiedQuery = `create ${record} content $data return id;`;
      break;
    case PersistenceActionType.MERGE:
      modifiedQuery = `UPDATE ${record} MERGE $data;`;
      break;
    case PersistenceActionType.BULK_MERGE:
      modifiedQuery = `UPDATE ${record} MERGE $data where id in $ids;`;
      break;
  }
  if (params?.isPreventMutationMapEntry) return modifiedQuery;
  return modifiedQuery + mutationMapEntry(record);
}

/**
 *
 * Any object property where the value is undefined is replaced with $NONE and further replaced with non string NONE - this is to remove the existing value for that field on Surreal effectively as sending "NONE" or null will not remove the field and also cause field type mismatch for SCHEMAFULL tables
 * @param query
 * @param params
 * @returns
 */
export function replaceParams(query: string, params: any) {
  // if (params) {
  //   for (const key in params) {
  //     query = query.replace(new RegExp(`\\$${key}`, "g"), params[key]);
  //   }
  // }
  for (const key in params) {
    let replaceWith;
    if (typeof params[key] === "object")
      replaceWith = JSON.stringify(params[key], (key, value) =>
        value === undefined ? `$NONE` : value
      );
    else if (typeof params[key] === "string") replaceWith = `"${params[key]}"`;
    else replaceWith = params[key];
    query = query.replaceAll("$" + key, `${replaceWith}`);
    query = query.replaceAll(`"$NONE"`, `NONE`);
  }
  return query;
}
