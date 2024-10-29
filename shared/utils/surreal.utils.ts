import { globalDbo } from "$lib/shared/dbo/global.dbo";
import { memotronDboDefinitions } from "$lib/shared/dbo/memotron.dbo";
import { memotronTables } from "$lib/shared/dbo/memotron.tables";
import { pointronDboDefinitions } from "$lib/shared/dbo/pointron.dbo";
import { pointronTables } from "$lib/shared/dbo/pointron.tables";
import { globalTables } from "../dbo/global.tables";
import {
  PersistenceActionType,
  StoreDataType,
  type IMutation,
  type IRecordId
} from "$lib/client/types/data.type";
import type { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { generateRandomId } from "./crypto.utils";

/**
 * Resolves a dbo update query based on the provided dependencies from the database operations.
 * Combines tables from pointron and memotron with global and specific function definitions to generate the query.
 *
 * @param dbo - An array of strings representing the dependencies to resolve in the query.
 * @returns The resolved update query string after processing the dependencies.
 */
export function resolveDboUpdateQuery(dbo: string[]) {
  if (!Array.isArray(dbo) || !dbo.every((item) => typeof item === "string")) {
    return "";
  }

  const tables = new Set([
    ...globalTables,
    // ...pointronTables,
    ...memotronTables
  ]);
  const functions = {
    ...globalDbo,
    ...pointronDboDefinitions,
    ...memotronDboDefinitions
  };

  const updates = dbo
    .map((dependency) => functions[dependency])
    .filter((func) => func)
    .flat();

  const updateQuery = `${[...tables, ...updates].join("; ")}`.replace(
    /\n|\t/g,
    ""
  );

  return updateQuery;
}

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

/**
 * @deprecated - used with old dataManager
 * @param type
 * @param record
 * @param params
 * @returns
 */
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

export function resolveInsertQuery(
  resource: string,
  records: any[],
  params?: { isUpsert?: boolean; isRelation?: boolean }
) {
  records = records.map((x) => {
    if (!x.id?.id) return x;
    return {
      ...x,
      id: x.id.id
    };
  });
  if (params?.isUpsert) {
    const query = `UPSERT ${resource} CONTENT ${JSON.stringify(
      records,
      noneReplacerFn
    )};`;
    return commonQueryReplacements(query);
  } else if (params?.isRelation) {
    const query = `INSERT RELATION INTO ${resource} ${JSON.stringify(
      records
    )};`;
    return commonQueryReplacements(query);
  }
  const query = `INSERT INTO ${resource} ${JSON.stringify(records)};`;
  return commonQueryReplacements(query);
}

export function generateResourceId(itemType: Resource): IRecordId {
  const id = generateRandomId();
  return `${itemType}:${id}`;
}

export function resolveUpsertQuery(resource: string, record: any) {
  let copy = { ...record };
  let id = copy.id;
  if (id && typeof id === "string" && !id.includes(":")) {
    id = `${resource}:${id}`;
  } else if (typeof id === "object" && id.id) {
    id = id.toString();
  } else if (!id) {
    id = generateResourceId(resource as any);
  }
  delete copy.id;
  const query = `UPSERT ${id} CONTENT ${JSON.stringify(copy, noneReplacerFn)};`;
  return { query: commonQueryReplacements(query), id };
}

/**
 * Removing the id from the record before merging as it is throwing an exception when using Surreal local sdk
 * @param record
 * @returns
 */
export function resolveMergeQuery(
  record: any,
  params?: { isUpsert?: boolean }
) {
  const recordCopy = { ...record };
  const recordId = recordCopy.id;
  delete recordCopy.id;
  let query;
  if (params?.isUpsert) {
    query = `UPSERT ${recordId} MERGE ${JSON.stringify(
      recordCopy,
      noneReplacerFn
    )};`;
  } else {
    query = `UPDATE ${recordId} MERGE ${JSON.stringify(
      recordCopy,
      noneReplacerFn
    )};`;
  }
  return commonQueryReplacements(query);
}

export function resolveBulkMergeQuery(
  resource: string,
  records: any[],
  params?: { isUpsert?: boolean }
) {
  const changedProperties = { ...records[0] };
  delete changedProperties.id;
  let query;
  const ids = records.map((x) => x.id);
  if (params?.isUpsert) {
    query = `UPSERT ${resource} MERGE ${JSON.stringify(
      changedProperties,
      noneReplacerFn
    )} where id in ${JSON.stringify(ids)};`;
  } else {
    query = `UPDATE ${resource} MERGE ${JSON.stringify(
      changedProperties,
      noneReplacerFn
    )} where id in ${JSON.stringify(ids)};`;
  }
  return commonQueryReplacements(query);
}

const noneReplacerFn = (key: string, value: any) =>
  value === undefined || value === null ? `$NONE` : value;

/**
 * Newer versions of Surreal SDK doesn't automatically convert the date to the surreal date format and record links. There d'format' is used for dates and removing quotes around record links to be detected as record links.
 */
export function commonQueryReplacements(query: string) {
  const dateRegex = /"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)"/g;
  const recordLinkRegex = /"([\w-]+:[\w-]+)"/g;
  const recordLinkRegexSingleQuotes = /'([\w-]+:[\w-]+)'/g;
  return query
    .replace(dateRegex, (match, p1) => `d'${p1}'`)
    .replace(recordLinkRegex, (match, p1) => p1)
    .replace(recordLinkRegexSingleQuotes, (match, p1) => p1)
    .replaceAll(`"$NONE"`, `NONE`);
}

/**
 * Used on the server side to resolve the mutation query when running mutations on the remote database.
 * @param mutation
 * @returns
 */
export function resolveMutationQueryV2(mutation: IMutation) {
  switch (mutation.params.action) {
    case PersistenceActionType.INSERT:
      return resolveInsertQuery(mutation.resource, mutation.params.records, {
        isUpsert: true
      });
    case PersistenceActionType.DELETE:
      return `DELETE ${mutation.resource} WHERE id = ${mutation.params.recordId}`;
    case PersistenceActionType.REPLACE:
      return `UPDATE ${mutation.resource} SET ${JSON.stringify(
        mutation.params
      )} WHERE id = ${mutation.id}`;
    case PersistenceActionType.MERGE:
      return resolveMergeQuery(mutation.params.record, { isUpsert: true });
    case PersistenceActionType.BULK_MERGE:
      return resolveBulkMergeQuery(mutation.resource, mutation.params.records, {
        isUpsert: true
      });
    case PersistenceActionType.CUSTOM:
      return replaceParams(mutation.params.query, mutation.params.data);
  }
}
