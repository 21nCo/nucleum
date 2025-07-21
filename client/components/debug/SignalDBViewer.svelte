<script lang="ts">
  import { onMount } from "svelte";
  import { flux } from "$lib/client/components/flux/flux";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { logger } from "$lib/client/components/debug/logger.client";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import type { SignalDBPersistence } from "$lib/client/persistence/signaldb/signaldb.local";
  import { stringify } from "$lib/shared/utils/json.utils";
  interface CollectionInfo {
    name: string;
    count: number;
    sampleData?: any[];
  }

  let collections: CollectionInfo[] = [];
  let isLoading = false;
  let error: string | null = null;
  let selectedCollection: string | null = null;
  let sampleData: any[] = [];

  onMount(async () => {
    await loadCollections();
  });

  async function loadCollections() {
    isLoading = true;
    error = null;
    collections = [];

    try {
      // Get the SignalDB persistence instance
      const persistence = flux.persistence as SignalDBPersistence;

      // Check if it's a SignalDB instance
      if (
        !persistence ||
        typeof (persistence as any).getCollection !== "function"
      ) {
        error = "SignalDB persistence not available or not initialized";
        return;
      }

      // Try to access collections directly if available
      const collectionsMap = (persistence as any).collections;
      if (collectionsMap && collectionsMap.size > 0) {
        for (const [name, collection] of collectionsMap.entries()) {
          try {
            const docs = await collection.find({}).fetch();
            collections.push({
              name,
              count: docs?.length || 0
            });
          } catch (e) {
            console.warn(`Error getting count for collection ${name}:`, e);
            collections.push({
              name,
              count: 0
            });
          }
        }
      } else {
        // Fallback: try to get collections for known resources
        const resourceTypes = Object.values(Resource);

        for (const resource of resourceTypes) {
          try {
            const collection = await (persistence as any).getCollection(
              resource
            );
            if (collection) {
              const docs = await collection.find({}).fetch();
              collections.push({
                name: resource,
                count: docs?.length || 0
              });
            }
          } catch (e) {
            // Skip collections that don't exist or can't be accessed
            console.warn(`Could not access collection ${resource}:`, e);
          }
        }
      }

      // Sort by name for consistent display
      collections = collections.sort((a, b) => a.name.localeCompare(b.name));
    } catch (e: any) {
      logger.error({ at: "SignalDBViewer.loadCollections", error: e });
      error = `Error loading collections: ${e.message}`;
    } finally {
      isLoading = false;
    }
  }

  async function loadSampleData(collectionName: string) {
    try {
      const persistence = flux.persistence as SignalDBPersistence;

      let collection;
      // Try to get collection using the private method
      if ((persistence as any).getCollection) {
        collection = await (persistence as any).getCollection(collectionName);
      } else if ((persistence as any).collections) {
        collection = (persistence as any).collections.get(collectionName);
      }

      if (collection) {
        // Use correct SignalDB API: pass limit as query options
        console.time("loadSampleData");
        const query = collection.find(
          {},
          { limit: collectionName === "node" ? 10000 : 10 }
        );
        const docs = await query.fetch();
        console.timeEnd("loadSampleData");
        sampleData = docs.slice(0, 10) || [];
        selectedCollection = collectionName;
      } else {
        sampleData = [];
        selectedCollection = collectionName;
      }
    } catch (e: any) {
      logger.error({ at: "SignalDBViewer.loadSampleData", error: e });
      error = `Error loading sample data: ${e.message}`;
    }
  }

  function formatData(data: any): string {
    try {
      return stringify(data, { space: 2 });
    } catch (e) {
      return String(data);
    }
  }
</script>

<div class="flex flex-col gap-4 p-4 h-full">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <Icon icon="database" />
      <h2 class="text-lg font-semibold">SignalDB Console</h2>
    </div>
    <Button
      size={Size.sm}
      icon="refresh"
      on:click={loadCollections}
      label="Refresh"
      {isLoading}
    />
  </div>

  {#if error}
    <div
      class="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded"
    >
      {error}
    </div>
  {/if}

  <div class="flex gap-4 h-full">
    <!-- Collections List -->
    <div class="w-1/3 flex flex-col gap-2">
      <h3 class="font-medium text-fgs1">Collections ({collections.length})</h3>
      <Divider colorStrength={ColorStrength.Subtle} />

      {#if isLoading}
        <div class="flex items-center gap-2 text-fgs2">
          <Icon icon="spinner" />
          Loading collections...
        </div>
      {:else if collections.length === 0}
        <div class="text-fgs2 text-sm">No collections found</div>
      {:else}
        <div class="flex flex-col gap-1 overflow-y-auto">
          {#each collections as collection}
            <button
              class="flex justify-between items-center p-2 rounded hover:bg-bgs2 text-left border border-transparent hover:border-brs1 transition-colors"
              class:bg-bgs2={selectedCollection === collection.name}
              class:border-brs1={selectedCollection === collection.name}
              on:click={() => loadSampleData(collection.name)}
            >
              <span class="font-mono text-sm truncate">{collection.name}</span>
              <span class="text-xs text-fgs2 bg-bgs3 px-2 py-1 rounded">
                {collection.count}
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Sample Data Display -->
    <div class="flex-1 flex flex-col gap-2">
      <h3 class="font-medium text-fgs1">
        {selectedCollection
          ? `Sample Data - ${selectedCollection}`
          : "Sample Data"}
      </h3>
      <Divider colorStrength={ColorStrength.Subtle} />

      {#if selectedCollection}
        {#if sampleData.length === 0}
          <div class="text-fgs2 text-sm">No documents in this collection</div>
        {:else}
          <div class="text-xs text-fgs2 mb-2">
            Showing up to 10 documents from {selectedCollection}
          </div>
          <div class="overflow-auto bg-bgs1 border border-brs1 rounded p-3">
            <pre
              class="text-xs font-mono text-fgs1 whitespace-pre-wrap">{formatData(
                sampleData
              )}</pre>
          </div>
        {/if}
      {:else}
        <div class="text-fgs2 text-sm">
          Select a collection to view sample data
        </div>
      {/if}
    </div>
  </div>
</div>
