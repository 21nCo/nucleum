import { globalDbo } from "$lib/shared/dbo/global.dbo";
import { memotronDboDefinitions } from "$lib/shared/dbo/memotron.dbo";
import { memotronTables } from "$lib/shared/dbo/memotron.tables";
import { pointronDboDefinitions } from "$lib/shared/dbo/pointron.dbo";
import { pointronTables } from "$lib/shared/dbo/pointron.tables";
import { globalTables } from "../dbo/global.tables";

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
    ...globalTables
    // ...pointronTables,
    // ...memotronTables
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
