import { globalDbo } from "$lib/shared/dbo/global.dbo";
import { memotronDboDefinitions } from "$lib/shared/dbo/memotron.dbo";
import { memotronTables } from "$lib/shared/dbo/memotron.tables";
import { pointronDboDefinitions } from "$lib/shared/dbo/pointron.dbo";
import { pointronTables } from "$lib/shared/dbo/pointron.tables";
import { globalTables } from "../dbo/global.tables";
import {
  type IPrimitiveDbDataType,
  type IResourceSelectParams,
  PersistenceActionType,
  SearchType,
  StoreDataType,
  type IMutation,
  type IRecordId,
  IResourceFilterOperator,
  IResourceFilterDateGrouping
} from "$lib/client/types/data.type";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
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

/**
 *
 * UPSERT resource content [] - this doesn't work. So, no way to bulk insert using upsert. Upsert also doesn't work for bulk merge or update. Upsert is only handy for single record upsert. In all other cases it is equivalent to UPDATE. See {@link resolveBulkMergeQuery} function for more notes.
 *
 * @param resource
 * @param records
 * @param params
 * @returns
 */
export function resolveInsertQuery(
  resource: Resource,
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
    // const query = `UPSERT ${resource} CONTENT ${JSON.stringify(
    //   records,
    //   noneReplacerFn
    // )};`;
    const query = generateUpsertQuery();
    return commonQueryReplacements(query, resource);
  } else if (params?.isRelation) {
    const query = `INSERT RELATION INTO ${resource} ${JSON.stringify(
      records
    )};`;
    return commonQueryReplacements(query, resource);
  }
  const query = `INSERT INTO ${resource} ${JSON.stringify(records)};`;
  return commonQueryReplacements(query, resource);

  function generateUpsertQuery() {
    let fullUpsertQuery = "";
    records.forEach((record) => {
      const { query, id } = resolveUpsertQuery(resource, record);
      fullUpsertQuery += query;
    });
    console.log({ fullUpsertQuery });
    return fullUpsertQuery;
  }
}

export function generateResourceId(itemType: Resource): IRecordId {
  const id = generateRandomId();
  return `${itemType}:${id}`;
}

export function resolveUpsertQuery(resource: Resource, record: any) {
  let copy = { ...record };
  let id = copy.id;
  if (id && typeof id === "string" && !id.includes(":")) {
    id = `${resource}:${id}`;
  } else if (typeof id === "object" && id.id) {
    id = id.toString();
  } else if (!id) {
    id = generateResourceId(resource);
  }
  delete copy.id;
  const query = `UPSERT ${id} CONTENT ${JSON.stringify(copy, noneReplacerFn)};`;
  return { query: commonQueryReplacements(query, resource), id };
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
  const resource = recordId.toString()?.split(":")?.[0];
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
  return commonQueryReplacements(query, resource);
}

/**
 *
 * UPSERT kv MERGE {"lastSyncUp":1} where id in [kv:testone, kv:testtwo, kv:testthree] - bulk upsert doesn't insert non existing records for example kv:textthree if not present using this syntax. It updates the existing records though - just like UPDATE.
 * 
 * 
 * UPSERT kv MERGE [
{
    'lastSyncUp': 2,
    id: kv:testone
},
{
    'lastSyncUp': 2,
    id: kv:testthree
}
]
 * - this also doesn't work - 'Can not use [{ id: kv:testone, lastSyncUp: 2 }, { id: kv:testthree, lastSyncUp: 2 }] in a MERGE clause'
 *
 *
 * @param resource
 * @param records
 * @param params
 * @returns
 */
export function resolveBulkMergeQuery(
  resource: Resource,
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
  return commonQueryReplacements(query, resource);
}

const noneReplacerFn = (key: string, value: any) =>
  value === undefined || value === null ? `$NONE` : value;

/**
 * Newer versions of Surreal SDK doesn't automatically convert the date to the surreal date format and record links. There d'format' is used for dates and removing quotes around record links to be detected as record links.
 */
export function commonQueryReplacements(query: string, resource?: Resource) {
  if (resource === Resource.mutation) return query;
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
      return resolveInsertQuery(
        mutation.resource as Resource,
        mutation.params.records,
        {
          isUpsert: true
        }
      );
    case PersistenceActionType.DELETE:
      return `DELETE ${mutation.resource} WHERE id = ${mutation.params.recordId}`;
    case PersistenceActionType.BULK_DELETE:
      return `DELETE ${
        mutation.resource
      } WHERE id in [${mutation.params.recordIds
        .map((x) => `${x}`)
        .join(",")}];`;
    case PersistenceActionType.REPLACE:
      return `UPDATE ${mutation.resource} SET ${JSON.stringify(
        mutation.params
      )} WHERE id = ${mutation.id}`;
    case PersistenceActionType.MERGE:
      return resolveMergeQuery(mutation.params.record, { isUpsert: true });
    case PersistenceActionType.BULK_MERGE:
      return resolveBulkMergeQuery(
        mutation.resource as Resource,
        mutation.params.records
      );
    case PersistenceActionType.CUSTOM:
      return replaceParams(mutation.params.query, mutation.params.data);
  }
}

export function resolveSelectQuery(
  resourceId: IRecordId,
  properties?: string[]
) {
  const props = properties ?? [];
  const selectClause =
    props.length > 0 ? `SELECT ${props.join(", ")}` : "SELECT *";
  return `${selectClause} FROM ONLY ${resourceId};`;
}

export function resolveSelectManyQuery(
  resource: Resource,
  params?: IResourceSelectParams
) {
  const properties = params?.properties ?? [];
  const whereClause = generateWhereClause(resource, params);
  const selectClause =
    properties.length > 0 ? `SELECT ${properties.join(", ")}` : "SELECT *";

  let query = `${selectClause} FROM ${resource} ${whereClause}`;
  if (
    params?.groupBy &&
    params?.groupBy?.length === 1 &&
    params?.groupBy[0] === "all"
  )
    query += ` GROUP ALL`;
  else if (params?.groupBy) query += ` GROUP BY ${params.groupBy.join(", ")}`;
  if (params?.orderBy)
    query += ` ORDER BY ${generateOrderByClause(params.orderBy)}`;
  if (params?.limit) query += ` LIMIT ${params.limit}`;
  if (params?.offset) query += ` START ${params.offset}`;

  return query;

  function generateOrderByClause(orderBy: IResourceSelectParams["orderBy"]) {
    if (!orderBy) return "";
    return Object.keys(orderBy)
      .map((key) => `${key} ${orderBy[key]}`)
      .join(", ");
  }
}

/**
 *
 * Note: using `string::lowercase()` on property field is resulting in no results at times.
 *
 * Ex: when searching for nodes and if property is `label`. Working fine for other properties like `body` or `contentType` or for Collection search with label property.
 *
 *
 * Not using `@@` index search - as defining index is increasing initial sync time (insert time for nodes) significantly.
 *
 *
 * @param search
 * @returns
 */
function generateSearchClause(search: IResourceSelectParams["search"]) {
  if (!search) return "";
  const conditions: string[] = [];
  search.properties?.forEach((property, index) => {
    conditions.push(useSimpleSearch(search.query, property));
  });
  return `(${conditions.join(" OR ")})`;

  function useSimpleSearch(searchQuery: string, property: string) {
    return `(type::is::string(${property}) AND string::lowercase('${searchQuery}') IN string::lowercase(${property}))`;

    // return `string::lowercase('${search.query}') IN string::lowercase(${property})`
  }

  function useIndexSearch(
    searchQuery: string,
    property: string,
    index: number
  ) {
    return `${property} @${index + 1}@ '${searchQuery}'`;
  }
}
/**
 * USe <|10|,COSINE> for brute force search where you don't want keep rerunning indexes on every new item addition
 * @param searchQuery
 * @returns
 */
function generateSemanticSearchClause(
  queryEmbedding: Float32Array[],
  k: number = 3
) {
  return `embedding <|${k}|> [${queryEmbedding}]`;
}

function generateWhereClause(
  resource: Resource,
  params?: IResourceSelectParams
): string {
  const conditions: string[] = [];

  const whereClause = params?.whereClause;
  if (whereClause && typeof whereClause === "string") {
    conditions.push(whereClause);
  } else if (whereClause && typeof whereClause === "object") {
    conditions.push(whereClause.join(" AND "));
  }

  if (params?.searchType === SearchType.SEMANTIC && params?.search) {
    conditions.push(
      generateSemanticSearchClause(
        params.search.queryEmbedding,
        params.semanticSearchTopK
      )
    );
  } else if (params?.search) {
    conditions.push(generateSearchClause(params.search));
  }

  for (const [key, value] of Object.entries(params?.filters ?? {})) {
    if (Array.isArray(value)) {
      conditions.push(`${key} IN [${value.map(formatValue).join(", ")}]`);
    } else if (Date.parse(value)) {
      conditions.push(resolveDateCondition(key, value));
    } else if (
      typeof value === "object" &&
      "type" in value &&
      value.type === "date"
    ) {
      let groupBy = IResourceFilterDateGrouping.DAY;
      if ("groupBy" in value) {
        groupBy = value.groupBy as IResourceFilterDateGrouping;
      }
      Object.entries(value).forEach(([operator, date]) => {
        if (operator === "type" || operator === "groupBy") return;
        conditions.push(
          resolveDateCondition(key, date as Date, {
            operator: operator as IResourceFilterOperator,
            groupBy: groupBy as IResourceFilterDateGrouping
          })
        );
      });
    } else if (typeof value === "object") {
      if ("greaterThan" in value) {
        conditions.push(`${key} > ${formatValue(value.greaterThan)}`);
      }
      if ("lessThan" in value) {
        conditions.push(`${key} < ${formatValue(value.lessThan)}`);
      }
      if ("greaterThanOrEqual" in value) {
        conditions.push(`${key} >= ${formatValue(value.greaterThanOrEqual)}`);
      }
      if ("lessThanOrEqual" in value) {
        conditions.push(`${key} <= ${formatValue(value.lessThanOrEqual)}`);
      }
      if ("notIn" in value) {
        conditions.push(
          `${key} NOT IN [${value.notIn.map(formatValue).join(", ")}]`
        );
      }
    } else if (typeof value === "boolean") {
      if (value === true) {
        conditions.push(`${key} IS true`);
      } else if (value === false) {
        conditions.push(
          `(${key} IS NULL OR ${key} IS false OR ${key} IS NONE OR ${key} IS 0)`
        );
      }
    } else if (value !== undefined) {
      conditions.push(`${key} = ${formatValue(value)}`);
    }
  }

  // return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const clause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return commonQueryReplacements(clause, resource);

  function formatValue(value: IPrimitiveDbDataType): string {
    if (typeof value === "string") {
      return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false"; // Use 'true' and 'false' for boolean literals
    }
    return String(value);
  }

  function resolveDateCondition(
    key: string,
    value: Date,
    params?: {
      operator?: IResourceFilterOperator;
      groupBy?: IResourceFilterDateGrouping;
    }
  ) {
    const {
      operator = IResourceFilterOperator.EQUALS,
      groupBy = IResourceFilterDateGrouping.DAY
    } = params ?? {};
    return `(${key} is not NONE AND time::group(${key},"${groupBy}") ${resolveOperator(operator)} time::group("${resolveDateInUtc(value)}","${groupBy}"))`;

    /**
     * Prevents the utc conversion problem that happens if .toISOString() is used.
     * @param date
     * @returns
     */
    function resolveDateInUtc(date: Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateOnlyStr = `${year}-${month}-${day}T00:00:00.000Z`;
      return dateOnlyStr;
    }
  }

  function resolveOperator(operator: IResourceFilterOperator) {
    switch (operator) {
      case IResourceFilterOperator.EQUALS:
        return "=";
      case IResourceFilterOperator.NOT_EQUALS:
        return "!=";
      case IResourceFilterOperator.GREATER_THAN:
        return ">";
      case IResourceFilterOperator.LESS_THAN:
        return "<";
      case IResourceFilterOperator.GREATER_THAN_OR_EQUALS:
        return ">=";
      case IResourceFilterOperator.LESS_THAN_OR_EQUALS:
        return "<=";
      case IResourceFilterOperator.IN:
        return "IN";
      case IResourceFilterOperator.NOT_IN:
        return "NOT IN";
      default:
        return "=";
    }
  }
}
