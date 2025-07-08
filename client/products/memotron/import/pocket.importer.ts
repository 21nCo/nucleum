import {
  CollectionType,
  CollectionLayout,
  type ICollectionView,
  type ICollection
} from "$lib/client/components/collection/collection.type";
import { collectionStore } from "$lib/client/components/collection/collection.store";
import { linker } from "$lib/client/products/memotron/linking/link.store";
import JSZip from "jszip";
import { sanitizeAndResolve } from "../node/url.utils";
import { nodeStore } from "../node/node.store";
import { NodeType } from "../node/node.type";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { generateResourceId } from "$lib/shared/utils/surreal.utils";
import { dispatchCustomEvent } from "$lib/client/utils/browser.utils";
import { GlobalEvent } from "$lib/client/types/event.enum";
import { logger } from "$lib/client/components/debug/logger.client";
import type {
  OmitForCapture,
  OmitForCaptureWithId
} from "$lib/client/components/flux/resourceStores/resource.type";
import { viewStore } from "$lib/client/components/collection/view.store";

export class PocketImporter {
  private processedUrls: Map<string, string> = new Map();
  private collectionItemsMap: Map<string, string[]> = new Map();
  private tagCollectionMap: Map<string, string> = new Map();
  private itemsInPocketCollections: any[] = [];
  constructor(
    private readonly fieldMappings: any,
    private readonly importId: string
  ) {}

  async run(file: File) {
    try {
      dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
        message: "Importing data from Pocket...",
        subMessage: "",
        percentage: 0.1
      });
      let totalCreated = 0;
      let collectionsCreated = 0;
      const extractedData = await this.processZipFile(file);
      const { csvFiles, collectionFiles, annotationFiles } = extractedData;
      const totalRecords =
        csvFiles.reduce((sum, csvFile) => sum + csvFile.data.length, 0) +
        collectionFiles.reduce(
          (sum, collectionFile) =>
            sum + (collectionFile.data.items?.length || 0),
          0
        ) +
        annotationFiles.reduce(
          (sum, annotationFile) =>
            sum +
            annotationFile.data.reduce(
              (annotationSum, annotation) =>
                annotationSum + (annotation.highlights?.length || 0),
              0
            ),
          0
        );

      if (this.fieldMappings.collections !== "ignore") {
        const collectionCount =
          await this.createCollectionsFromFiles(collectionFiles);
        totalCreated += collectionCount;
        collectionsCreated += collectionFiles.length;
      }
      await this.updateProgress(0.25);
      const csvCount = await this.createNodesFromCsvFiles(csvFiles);
      totalCreated += csvCount;
      await this.updateProgress(0.5);
      if (this.itemsInPocketCollections.length > 0) {
        await this.createNodes(this.itemsInPocketCollections);
      }
      await this.addLinks();
      await this.updateProgress(0.75);
      const annotationCount =
        await this.createAnnotationsFromFiles(annotationFiles);
      await this.updateProgress(0.9);
      totalCreated += annotationCount;
      if (this.fieldMappings.tags !== "ignore") {
        const collectionType =
          this.fieldMappings.tags === "typed_collections"
            ? CollectionType.TYPED
            : CollectionType.UNTYPED;
        await this.createCollections(
          Array.from(this.tagCollectionMap.entries()).map(([tag, id]) => ({
            id,
            label: tag,
            type: collectionType
          }))
        );
        collectionsCreated += this.tagCollectionMap.size;
      }
      return { totalCreated, totalRecords, collectionsCreated };
    } catch (error) {
      logger.error({ at: "PocketImporter.run", error });
    } finally {
      setTimeout(() => {
        dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
          message: "Import completed.",
          subMessage: "",
          isFinished: true
        });
      }, 500);
    }
  }

  private updateProgress(percentage: number) {
    dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
      percentage
    });
  }

  private async processZipFile(file: File) {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      const csvFiles: { fileName: string; data: any[] }[] = [];
      const collectionFiles: { fileName: string; data: any }[] = [];
      const annotationFiles: { fileName: string; data: any[] }[] = [];

      // Process each file in the ZIP
      for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
        if (zipEntry.dir) continue; // Skip directories

        const fileName = zipEntry.name.toLowerCase();
        const folderPath = relativePath.toLowerCase();

        // Process CSV files
        if (fileName.endsWith(".csv")) {
          const fileContent = await zipEntry.async("string");
          const records = this.parseCsv(fileContent);
          csvFiles.push({ fileName: zipEntry.name, data: records });
        }
        // Process JSON collection files
        else if (
          folderPath.includes("collections") &&
          fileName.endsWith(".json")
        ) {
          const fileContent = await zipEntry.async("string");
          try {
            const collectionData = JSON.parse(fileContent);
            // Only process non-empty collections
            if (collectionData.items && collectionData.items.length > 0) {
              collectionFiles.push({
                fileName: zipEntry.name,
                data: collectionData
              });
            }
          } catch (e) {
            console.warn(
              `Failed to parse collection file ${zipEntry.name}:`,
              e
            );
          }
        }
        // Process JSON annotation files
        else if (
          folderPath.includes("annotations") &&
          fileName.endsWith(".json")
        ) {
          const fileContent = await zipEntry.async("string");
          try {
            const annotationData = JSON.parse(fileContent);
            if (Array.isArray(annotationData) && annotationData.length > 0) {
              annotationFiles.push({
                fileName: zipEntry.name,
                data: annotationData
              });
            }
          } catch (e) {
            console.warn(
              `Failed to parse annotation file ${zipEntry.name}:`,
              e
            );
          }
        }
      }

      return { csvFiles, collectionFiles, annotationFiles };
    } catch (error) {
      console.error("Error processing ZIP file:", error);
      throw new Error(
        `Failed to process ZIP file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private parseCsv(csvText: string) {
    const lines = csvText.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());

    const urlIndex = headers.findIndex((h) => h.toLowerCase().includes("url"));
    const titleIndex = headers.findIndex(
      (h) =>
        h.toLowerCase().includes("title") || h.toLowerCase().includes("name")
    );
    const tagsIndex = headers.findIndex((h) =>
      h.toLowerCase().includes("tags")
    );
    const timeIndex = headers.findIndex(
      (h) =>
        h.toLowerCase().includes("time_added") ||
        h.toLowerCase().includes("date") ||
        h.toLowerCase().includes("created_at")
    );
    const statusIndex = headers.findIndex((h) =>
      h.toLowerCase().includes("status")
    );

    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(",");
      if (columns.length < 2) continue;

      const url = columns[urlIndex]?.replace(/"/g, "").trim();
      const title = columns[titleIndex]?.replace(/"/g, "").trim();
      const tags = columns[tagsIndex]?.replace(/"/g, "").trim();
      const timestamp = columns[timeIndex]?.replace(/"/g, "").trim();
      const status = columns[statusIndex]?.replace(/"/g, "").trim();
      if (url && url.startsWith("http")) {
        records.push({
          url,
          title: title || url,
          tags: tags ? tags.split("|").map((t) => t.trim()) : [],
          timestamp: timestamp ? new Date(+timestamp * 1000) : new Date(),
          status: status ? status.toLowerCase() : "unread"
        });
      }
    }

    return records;
  }

  private async createNodes(nodes: any[]) {
    console.log({ nodes });
    const createdNodes = await nodeStore.create(nodes as any);
    return createdNodes;
  }
  private async createCollections(collections: any[]) {
    console.log({ collections });
    let collectionsToCreate: OmitForCaptureWithId<ICollection>[] = [];
    let views: OmitForCaptureWithId<ICollectionView>[] = [];
    for (const collection of collections) {
      const viewId = generateResourceId(Resource.view);
      views.push({
        id: viewId,
        layout: CollectionLayout.BOARD,
        label: "Default",
        tabBy: "none",
        groupBy: "none",
        subGroupBy: "none",
        importId: this.importId
      });
      collectionsToCreate.push({
        ...collection,
        resource: Resource.node,
        views: [viewId],
        importId: this.importId
      });
    }
    const createdCollections =
      await collectionStore.create(collectionsToCreate);
    await viewStore.create(views);
    return createdCollections;
  }

  private async addLinks() {
    for (const [collectionId, nodeIds] of this.collectionItemsMap) {
      console.log({ collectionId, nodeIds });
      await linker.bulkLink(nodeIds, collectionId, Resource.collection, {
        importId: this.importId
      });
    }
  }

  private async createNodesFromCsvFiles(
    csvFiles: { fileName: string; data: any[] }[]
  ) {
    let totalCreated = 0;
    for (const csvFile of csvFiles) {
      if (Array.isArray(csvFile.data)) {
        totalCreated += await this.createNodesFromRecords(csvFile.data);
      }
    }
    return totalCreated;
  }

  private async createCollectionsFromFiles(
    collectionFiles: { fileName: string; data: any }[]
  ) {
    let totalNodesCreated = 0;

    for (const collectionFile of collectionFiles) {
      const collection = collectionFile.data;

      const collectionId = generateResourceId(Resource.collection).toString();

      const collectionType =
        this.fieldMappings.collections === "typed_collections"
          ? CollectionType.TYPED
          : CollectionType.UNTYPED;

      try {
        await this.createCollections([
          {
            id: collectionId,
            label: collection.title || collection.slug,
            description: collection.description || null,
            type: collectionType
          }
        ]);
      } catch (error) {
        console.error("Error creating collection:", error);
      }

      if (collection.items && Array.isArray(collection.items)) {
        const collectionNodes = collection.items.map((item: any) => {
          const sanitized = sanitizeAndResolve(item.url);
          const contentType =
            typeof sanitized === "object"
              ? sanitized.contentType
              : NodeType.WEB_PAGE;
          const url = typeof sanitized === "object" ? sanitized.url : sanitized;

          const nodeId = generateResourceId(Resource.node).toString();
          this.processedUrls.set(item.url, nodeId);

          return {
            id: nodeId,
            contentType,
            url,
            label: item.title,
            body: {
              hash: btoa(item.url),
              description: item.excerpt || ""
            },
            importId: this.importId,
            metadata: {
              originalNote: item.note
            },
            createdAt: new Date(collection.createdAt),
            notes: item.note || "",
            text: item.excerpt || "",
            collections: [collectionId]
          };
        });

        try {
          this.itemsInPocketCollections.push(...collectionNodes);
          totalNodesCreated += collectionNodes.length;
          if (
            collectionId &&
            collectionNodes &&
            Array.isArray(collectionNodes)
          ) {
            this.collectionItemsMap.set(
              collectionId,
              collectionNodes.map((node) => node.id.toString())
            );
          }
        } catch (error) {
          console.error("Error creating collection nodes:", error);
        }
      }
    }
    return totalNodesCreated;
  }

  private async createAnnotationsFromFiles(
    annotationFiles: { fileName: string; data: any[] }[]
  ) {
    let totalCreated = 0;

    for (const annotationFile of annotationFiles) {
      const annotations = annotationFile.data;

      for (const annotation of annotations) {
        if (annotation.highlights && Array.isArray(annotation.highlights)) {
          const parentId = this.processedUrls.get(annotation.url);
          let annotationNodes: any[] = [];
          for (const highlight of annotation.highlights) {
            try {
              const id = generateResourceId(Resource.node);
              const annotationNode = {
                id,
                contentType: NodeType.TEXT_CLIP,
                url: `${annotation.url}#${id.toString()}`,
                label: `Highlight from ${annotation.title}`,
                body: {
                  text: highlight.quote
                },
                importId: this.importId,
                metadata: {
                  sourceUrl: annotation.url,
                  sourceTitle: annotation.title,
                  highlightCreatedAt: highlight.created_at
                },
                createdAt: new Date(highlight.created_at * 1000),
                parent: parentId,
                text: highlight.quote
              };
              annotationNodes.push(annotationNode);
            } catch (error) {
              console.error("Error creating annotation node:", error);
            }
          }
          await this.createNodes(annotationNodes as any);
          totalCreated += annotationNodes.length;
        }
      }
    }

    return totalCreated;
  }

  private mapTagsToCollections(tags: string[]) {
    const collectionIds: string[] = [];
    for (const tag of tags) {
      const tagCollectionId = this.tagCollectionMap.get(tag.trim());
      if (tagCollectionId) {
        collectionIds.push(tagCollectionId);
      } else {
        const collectionId = generateResourceId(Resource.collection).toString();
        this.tagCollectionMap.set(tag.trim(), collectionId);
        collectionIds.push(collectionId);
      }
    }
    return collectionIds;
  }

  private async createNodesFromRecords(records: any[]) {
    const batchSize = 50;
    let totalCreated = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      let nodes = batch.map((record) => {
        const isExisting = this.processedUrls.has(record.url);
        const nodeId = isExisting
          ? this.processedUrls.get(record.url)
          : generateResourceId(Resource.node).toString();
        if (!nodeId) return null;
        let collectionIds: string[] = [];
        if (
          this.fieldMappings.tags !== "ignore" &&
          record.tags &&
          record.tags.length > 0
        ) {
          collectionIds = this.mapTagsToCollections(record.tags);
          for (const collectionId of collectionIds) {
            const existing = this.collectionItemsMap.get(collectionId);
            this.collectionItemsMap.set(collectionId, [
              ...(existing ?? []),
              nodeId
            ]);
          }
        }
        if (isExisting) {
          let existingNode = this.itemsInPocketCollections.find(
            (node) => node.url === record.url
          );
          if (existingNode) {
            existingNode.collections.push(...collectionIds);
            existingNode = {
              ...existingNode,
              metadata: {
                ...existingNode.metadata,
                originalTags: record.tags,
                originalStatus: record.status,
                originalTimestamp: record.timestamp
              }
            };
            this.itemsInPocketCollections = this.itemsInPocketCollections.map(
              (node) => (node.url === record.url ? existingNode : node)
            );
            return null;
          }
        }
        this.processedUrls.set(record.url, nodeId);
        const sanitized = sanitizeAndResolve(record.url);
        const contentType =
          typeof sanitized === "object"
            ? sanitized.contentType
            : NodeType.WEB_PAGE;
        const url = typeof sanitized === "object" ? sanitized.url : sanitized;

        return {
          id: nodeId,
          contentType,
          url,
          label: record.title,
          body: {
            hash: btoa(record.url),
            description: ""
          },
          importId: this.importId,
          metadata: {
            originalTags: record.tags,
            originalStatus: record.status,
            originalTimestamp: record.timestamp
          },
          createdAt: record.timestamp,
          parent: undefined,
          text: "",
          collections: collectionIds
        };
      });

      try {
        nodes = nodes.filter(Boolean);
        await this.createNodes(nodes as any);
        totalCreated += nodes.length;

        // TODO - progress setting
        // if (tempFileList) {
        //   const progress = Math.min(
        //     90,
        //     Math.floor((totalCreated / records.length) * 90)
        //   );
        //   tempFileList = tempFileList.map((item) => ({
        //     ...item,
        //     uploadProgress: progress
        //   }));
        // }
      } catch (error) {
        console.error("Error creating batch of nodes:", error);
        throw error;
      }
    }

    return totalCreated;
  }
}
