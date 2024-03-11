import { StoreDataType } from "../types/store.type";

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

export function mutationEntryQuery(recordId: string) {
  const tb = recordId.includes(":") ? recordId.split(":")[0] : recordId;
  return `;update kv:mutationMap set ${tb} = ${+(
    new Date().getTime() / 1000
  ).toFixed()};`;
}
