<script lang="ts">
  import { onMount } from "svelte";
  import { flux } from "$lib/client/components/flux/flux";
  import { logger } from "$lib/client/components/debug/logger.client";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import type { DexiePersistence } from "$lib/client/persistence/dexie/dexie.local";
  import { cn } from "$lib/client/utils/ui.utils";
  import { stringify } from "$lib/shared/utils/json.utils";

  interface TableInfo {
    name: string;
    count: number;
    indexes: string[];
    indexCounts?: Record<string, { distinct: number; total: number }>;
  }

  interface DatabaseInfo {
    name: string;
    version: number;
    tables: TableInfo[];
  }

  let databaseInfo: DatabaseInfo | null = null;
  let isLoading = false;
  let error: string | null = null;
  let selectedTable: string | null = null;
  let kvLocalData: any = null;
  let expandedTables: Set<string> = new Set();
  let isReindexing = false;
  // Record query functionality
  let queryTable: string = "";
  let queryIds: string = "";
  let queryResults: any[] = [];
  let isQuerying = false;
  let queryError: string | null = null;

  onMount(async () => {
    await loadDatabaseInfo();
  });

  async function loadDatabaseInfo() {
    isLoading = true;
    error = null;
    databaseInfo = null;

    try {
      const persistence = flux.persistence as DexiePersistence;

      if (!persistence || !persistence.instance) {
        error = "Dexie persistence not available or not initialized";
        return;
      }

      const db = persistence.instance;

      // Get database name and version
      const dbName = db.name;
      const dbVersion = db.verno;

      // Get all table names
      const tableNames = db.tables.map((table) => table.name);

      // Build table information
      const tables: TableInfo[] = [];

      for (const tableName of tableNames) {
        try {
          const table = db.table(tableName);
          const count = await table.count();

          // Get indexes from schema
          const indexes = table.schema.indexes.map(
            (index) =>
              `${index.name}${index.unique ? " (unique)" : ""}${index.multi ? " (multi)" : ""}`
          );

          // Get index counts for categorical data
          const indexCounts: Record<
            string,
            { distinct: number; total: number }
          > = {};
          for (const index of table.schema.indexes) {
            if (index.name !== "id" && !index.multi) {
              try {
                const distinctValues = await table
                  .orderBy(index.name)
                  .uniqueKeys();

                // Count total records with defined values for this index
                // Use a more compatible approach by getting all records and filtering
                const allRecords = await table.toArray();
                const totalWithIndex = allRecords.filter(
                  (record) =>
                    record[index.name] !== null &&
                    record[index.name] !== undefined &&
                    record[index.name] !== ""
                ).length;

                indexCounts[index.name] = {
                  distinct: distinctValues.length,
                  total: totalWithIndex
                };
              } catch (e) {
                // Skip if error getting distinct values
              }
            }
          }

          tables.push({
            name: tableName,
            count,
            indexes,
            indexCounts
          });
        } catch (e) {
          logger.error({
            at: "DexieConsole.loadTableInfo",
            table: tableName,
            error: e
          });
          tables.push({
            name: tableName,
            count: 0,
            indexes: [],
            indexCounts: {}
          });
        }
      }

      databaseInfo = {
        name: dbName,
        version: dbVersion,
        tables: tables.sort((a, b) => a.name.localeCompare(b.name))
      };

      // Load kv:local data
      await loadKvLocalData();
    } catch (e) {
      logger.error({ at: "DexieConsole.loadDatabaseInfo", error: e });
      error = `Failed to load database info: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      isLoading = false;
    }
  }

  async function loadKvLocalData() {
    try {
      const persistence = flux.persistence as DexiePersistence;
      kvLocalData = await persistence.select("kv:local");
    } catch (e) {
      logger.error({ at: "DexieConsole.loadKvLocalData", error: e });
    }
  }

  function toggleTableExpansion(tableName: string) {
    if (expandedTables.has(tableName)) {
      expandedTables.delete(tableName);
    } else {
      expandedTables.add(tableName);
    }
    expandedTables = new Set(expandedTables);
  }

  async function queryAllRecords() {
    if (!queryTable) {
      queryError = "Please select a table";
      return;
    }

    isQuerying = true;
    queryError = null;
    queryResults = [];

    try {
      const persistence = flux.persistence as DexiePersistence;
      if (!persistence.instance) {
        queryError = "Database not available";
        return;
      }
      console.time("queryAllRecords");
      const table = persistence.instance.table(queryTable);
      const results = await table.toArray();
      console.timeEnd("queryAllRecords");
      queryResults = results;
    } catch (e) {
      logger.error({
        at: "DexieConsole.queryAllRecords",
        table: queryTable,
        error: e
      });
      queryError = `Query failed: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      isQuerying = false;
    }
  }

  async function queryRecordsByIds() {
    if (!queryTable || !queryIds.trim()) {
      queryError = "Please select a table and enter record IDs";
      return;
    }

    isQuerying = true;
    queryError = null;
    queryResults = [];

    try {
      const persistence = flux.persistence as DexiePersistence;
      if (!persistence.instance) {
        queryError = "Database not available";
        return;
      }

      // Parse IDs from input (comma or line separated)
      const ids = queryIds
        .split(/[,\n]/)
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      if (ids.length === 0) {
        queryError = "No valid IDs provided";
        return;
      }

      const table = persistence.instance.table(queryTable);
      const results = await table.where("id").anyOf(ids).toArray();

      queryResults = results;
    } catch (e) {
      logger.error({
        at: "DexieConsole.queryRecordsByIds",
        table: queryTable,
        error: e
      });
      queryError = `Query failed: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      isQuerying = false;
    }
  }

  async function copyResultsToClipboard() {
    try {
      const resultsJson = stringify(queryResults, { space: 2 });
      await navigator.clipboard.writeText(resultsJson);
    } catch (e) {
      logger.error({ at: "DexieConsole.copyResultsToClipboard", error: e });
    }
  }

  function formatValue(value: any): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "object") {
      return stringify(value, { space: 2 });
    }
    return String(value);
  }

  async function reIndexDatabase() {
    isReindexing = true;
    const persistence = flux.persistence as DexiePersistence;
    await persistence.triggerBackgroundIndexing(true);
    isReindexing = false;
  }
</script>

<div class="w-full h-full flex flex-col gap-4 p-4">
  <div class="flex items-center justify-between">
    <h2 class="text-b1 font-semibold text-fgs1">Dexie Console</h2>
    <div class="flex items-center gap-2">
      <Button
        size={Size.sm}
        isLoading={isReindexing}
        icon="reload"
        on:click={reIndexDatabase}
        label="Reindex"
      />
      <Button
        size={Size.sm}
        icon="refresh"
        on:click={loadDatabaseInfo}
        label="Refresh"
      />
    </div>
  </div>

  {#if isLoading}
    <div class="flex items-center justify-center p-8">
      <div class="text-fgs2">Loading database information...</div>
    </div>
  {:else if error}
    <div class="flex items-center justify-center p-8">
      <div class="text-red-500">{error}</div>
    </div>
  {:else if databaseInfo}
    <div class="space-y-4">
      <!-- Database Overview -->
      <div class="bg-bgs2 rounded-lg p-3 border border-brs3">
        <h3 class="text-b2 font-medium text-fgs1 mb-2">Database Overview</h3>
        <div class="grid grid-cols-2 gap-4 text-b3">
          <div>
            <span class="text-fgs2">Name:</span>
            <span class="text-fgs1 ml-2">{databaseInfo.name}</span>
          </div>
          <div>
            <span class="text-fgs2">Version:</span>
            <span class="text-fgs1 ml-2">{databaseInfo.version}</span>
          </div>
          <div>
            <span class="text-fgs2">Tables:</span>
            <span class="text-fgs1 ml-2">{databaseInfo.tables.length}</span>
          </div>
          <div>
            <span class="text-fgs2">Total Records:</span>
            <span class="text-fgs1 ml-2"
              >{databaseInfo.tables.reduce((sum, t) => sum + t.count, 0)}</span
            >
          </div>
        </div>
      </div>

      <!-- Record Query Tool -->
      <div class="bg-bgs2 rounded-lg p-3 border border-brs3">
        <h3 class="text-b2 font-medium text-fgs1 mb-3">Query Records by ID</h3>
        <div class="space-y-3">
          <div>
            <label class="text-b3 text-fgs2 block mb-1">Table:</label>
            <select
              bind:value={queryTable}
              class="w-full p-2 bg-bgs3 border border-brs3 rounded text-b3 text-fgs1"
            >
              <option value="">Select a table...</option>
              {#each databaseInfo.tables as table}
                <option value={table.name}>{table.name}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="text-b3 text-fgs2 block mb-1"
              >Record IDs (comma or line separated):</label
            >
            <textarea
              bind:value={queryIds}
              placeholder="Enter record IDs..."
              class="w-full p-2 bg-bgs3 border border-brs3 rounded text-b3 text-fgs1 h-20 resize-none"
            ></textarea>
          </div>
          <div class="flex gap-2">
            <Button
              size={Size.sm}
              type={ButtonVariant.PRIMARY}
              label={isQuerying ? "Querying..." : "Query records"}
              isDisabled={isQuerying || !queryTable || !queryIds.trim()}
              on:click={queryRecordsByIds}
            />
            <Button
              size={Size.sm}
              label={isQuerying ? "Querying..." : "Query all"}
              isDisabled={isQuerying || !queryTable}
              on:click={queryAllRecords}
            />
            {#if queryResults.length > 0}
              <Button
                size={Size.sm}
                type={ButtonVariant.SECONDARY}
                icon="copy"
                label="Copy Results"
                on:click={copyResultsToClipboard}
              />
            {/if}
          </div>
          {#if queryError}
            <div class="text-ars1 text-b3">{queryError}</div>
          {/if}
          {#if queryResults.length > 0}
            <div>
              <div class="text-b3 text-fgs1 mb-2">
                Results ({queryResults.length} records):
              </div>
              <pre
                class="text-b3 text-fgs2 bg-bgs3 rounded p-2 max-h-60 overflow-auto">{formatValue(
                  queryResults
                )}</pre>
            </div>
          {/if}
        </div>
      </div>

      <!-- KV Local Data -->
      {#if kvLocalData}
        <div class="bg-bgs2 rounded-lg p-3 border border-brs3">
          <h3 class="text-b2 font-medium text-fgs1 mb-2">kv:local Record</h3>
          <pre class="text-b3 text-fgs2 bg-bgs3 rounded p-2">{formatValue(
              kvLocalData
            )}</pre>
        </div>
      {/if}

      <!-- Tables Grid -->
      <div>
        <h3 class="text-b2 font-medium text-fgs1 mb-3">Tables</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each databaseInfo.tables as table}
            <div class="bg-bgs2 rounded-lg p-4 border border-brs3">
              <!-- Table Header -->
              <div class="mb-3">
                <h4 class="text-b2 font-medium text-fgs1">{table.name}</h4>
                <div class="text-b3 text-fgs2">{table.count} records</div>
              </div>

              <!-- Indexes -->
              {#if table.indexes.length > 0}
                <div class="space-y-2">
                  <h5 class="text-b3 font-medium text-fgs1">Indexes</h5>
                  <div class="space-y-1">
                    {#each table.indexes as index}
                      <div class="bg-bgs3 rounded p-2">
                        <div class="text-b3 text-fgs1 font-medium">{index}</div>
                        {#if table.indexCounts && table.indexCounts[index.split(" ")[0]]}
                          <div class="text-b4 text-fgs2">
                            {table.indexCounts[index.split(" ")[0]].distinct} distinct
                            /
                            {table.indexCounts[index.split(" ")[0]].total} total
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              {:else}
                <div class="text-b3 text-fgs2 italic">No indexes</div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <div class="flex items-center justify-center p-8">
      <div class="text-fgs2">No database information available</div>
    </div>
  {/if}
</div>
