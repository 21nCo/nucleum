<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import LinkItems from "$lib/client/products/memotron/common/linkbox/LinkItems.svelte";
  import LinkSearch from "$lib/client/products/memotron/common/linkbox/LinkSearch.svelte";
  import InlineFeedbackText from "$lib/client/extensions/clipper/InlineFeedbackText.svelte";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import {
    AlertType,
    type IInlineStatus
  } from "$lib/client/types/notification.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import {
    determineResourceType,
    isSameResource
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import type { ICollectionItemPropertyValue } from "$lib/client/components/collection/collection.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import type {
    INodeThumb,
    INodeLinkThumb
  } from "$lib/client/products/memotron/node/node.type";
  import { linker } from "$lib/client/products/memotron/linking/link.store";
  import { LinkType } from "$lib/client/products/memotron/linking/link.type";
  import { nodeStore } from "$lib/client/products/memotron/node/node.store";
  import { ResourceError } from "$lib/client/components/error/errors";
  import { ResourceErrorCode } from "$lib/client/components/error/error.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { Size } from "$lib/client/types/size.enum";

  const dispatcher = createEventDispatcher();

  export let savedNodeId: IRecordId | undefined;
  export let savedNode: INodeThumb | undefined;
  export let expandedLink: IRecordId | null = null;

  let linkSearchQuery: string = "";
  let linkedResources: IRecordId[] = [];
  let linkedProperties: ICollectionItemPropertyValue[] = [];
  let linkFeedback: IInlineStatus | undefined = undefined;
  let isLinkboxLoading: boolean = false;

  let linkSearchExclusions: IRecordId[] = [];
  let hasLinkedResources: boolean = false;
  let lastRefreshedId: string | undefined;

  $: linkSearchExclusions = [
    ...(linkedResources ?? []),
    ...(savedNodeId ? [savedNodeId] : [])
  ].filter(Boolean) as IRecordId[];

  $: hasLinkedResources = linkedResources.length > 0;

  $: if (savedNodeId) {
    const nodeIdStr = savedNodeId.toString();
    if (lastRefreshedId !== nodeIdStr) {
      lastRefreshedId = nodeIdStr;
      refreshLinkedData(savedNodeId).catch((error) => {
        logger.error({ at: "LinkBoxOnSaver.reactiveRefresh", error });
      });
    }
  } else {
    linkedResources = [];
    linkedProperties = [];
    expandedLink = null;
    lastRefreshedId = undefined;
  }

  export async function refreshLinkedData(nodeId: IRecordId | undefined) {
    if (!nodeId) return;
    const nodeIdStr = nodeId.toString();
    try {
      isLinkboxLoading = true;
      const [nodeResult, inboundLinks, outboundLinks] = await Promise.all([
        nodeStore.select(nodeId),
        linker.selectMany({
          filters: {
            in: nodeIdStr,
            linkType: LinkType.DIRECT
          }
        }),
        linker.selectMany({
          filters: {
            out: nodeIdStr,
            linkType: LinkType.DIRECT
          }
        })
      ]);

      const directLinks: INodeLinkThumb[] = [
        ...(inboundLinks ?? []),
        ...(outboundLinks ?? [])
      ]
        .map((link) => {
          const isOutgoing = link.in.toString() === nodeIdStr;
          const target = (isOutgoing ? link.out : link.in) as IRecordId;
          return {
            linkedTo: target,
            linkType: link.linkType,
            id: link.id,
            tags: link.tags,
            direction: isOutgoing ? "outgoing" : "incoming"
          } as INodeLinkThumb;
        })
        .filter((link) => !link.linkType || link.linkType === LinkType.DIRECT);

      const collections = nodeResult?.collections ?? [];
      const properties = nodeResult?.properties ?? [];

      linkedProperties = properties;

      const uniqueIds = new Set<string>();
      const aggregated: IRecordId[] = [];
      directLinks.forEach((link) => {
        const idStr = link.linkedTo.toString();
        if (!uniqueIds.has(idStr)) {
          uniqueIds.add(idStr);
          aggregated.push(link.linkedTo);
        }
      });
      collections.forEach((collection) => {
        const idStr = collection.toString();
        if (!uniqueIds.has(idStr)) {
          uniqueIds.add(idStr);
          aggregated.push(collection);
        }
      });

      linkedResources = aggregated;

      if (
        expandedLink &&
        !aggregated.some((id) => isSameResource(id, expandedLink))
      ) {
        expandedLink = null;
      }

      const updatedNode: INodeThumb | undefined = nodeResult
        ? {
            ...(nodeResult as INodeThumb),
            links: directLinks,
            collections,
            properties
          }
        : savedNode
          ? {
              ...savedNode,
              links: directLinks,
              collections,
              properties
            }
          : undefined;

      if (updatedNode) {
        savedNode = updatedNode;
        dispatcher("savedNodeChange", { savedNode: updatedNode });
      }
    } catch (error) {
      logger.error({ at: "LinkBoxOnSaver.refreshLinkedData", error });
    } finally {
      isLinkboxLoading = false;
    }
  }

  async function handleLinkSelect(e: CustomEvent<{ item: { id: IRecordId } }>) {
    if (!savedNodeId || !e.detail?.item?.id) return;
    const targetId = e.detail.item.id as IRecordId;
    const resourceType = determineResourceType(targetId);
    linkFeedback = {
      message:
        resourceType === Resource.collection
          ? "Adding to collection..."
          : "Linking...",
      type: AlertType.PROGRESS
    };

    try {
      await linker.link(savedNodeId, targetId, {
        linkType: LinkType.DIRECT,
        context: ResourceAccessPoint.CAPTURE
      });
      linkFeedback = {
        message:
          resourceType === Resource.collection
            ? "Added to collection!"
            : "Link added!",
        type: AlertType.SUCCESS
      };
      await refreshLinkedData(savedNodeId);
    } catch (error) {
      logger.error({ at: "LinkBoxOnSaver.handleLinkSelect", error });
      if (error instanceof ResourceError) {
        if (error.code === ResourceErrorCode.ALREADY_EXISTS) {
          linkFeedback = {
            message:
              resourceType === Resource.collection
                ? "Already part of this collection."
                : "Link already exists.",
            type: AlertType.ERROR
          };
        } else {
          linkFeedback = {
            message: error.message ?? "Failed to add link.",
            type: AlertType.ERROR
          };
        }
      } else {
        linkFeedback = {
          message: "Failed to add link.",
          type: AlertType.ERROR
        };
      }
    } finally {
      linkSearchQuery = "";
    }
  }

  async function handleUnlink(e: CustomEvent<IRecordId>) {
    if (!savedNodeId || !e.detail) return;
    const targetId = e.detail;
    const resourceType = determineResourceType(targetId);
    linkFeedback = {
      message:
        resourceType === Resource.collection
          ? "Removing from collection..."
          : "Removing link...",
      type: AlertType.PROGRESS
    };
    try {
      await linker.unlink(savedNodeId, targetId, {
        linkType: LinkType.DIRECT,
        isIncludeReverseDirection: resourceType !== Resource.collection,
        context: ResourceAccessPoint.CAPTURE
      });
      linkFeedback = {
        message:
          resourceType === Resource.collection
            ? "Removed from collection."
            : "Link removed.",
        type: AlertType.SUCCESS
      };
      await refreshLinkedData(savedNodeId);
    } catch (error) {
      logger.error({ at: "LinkBoxOnSaver.handleUnlink", error });
      linkFeedback = {
        message: "Failed to remove link.",
        type: AlertType.ERROR
      };
    }
  }

  async function handlePropertyChange(
    e: CustomEvent<ICollectionItemPropertyValue>
  ) {
    if (!savedNodeId || !e.detail) return;
    const property = e.detail;
    linkFeedback = {
      message: "Saving property...",
      type: AlertType.PROGRESS
    };
    try {
      let properties = linkedProperties.filter(
        (item) => !isSameResource(item.id, property.id)
      );
      properties = [...properties, property];
      linkedProperties = properties;
      if (savedNode) {
        savedNode = { ...savedNode, properties };
        dispatcher("savedNodeChange", { savedNode });
      }
      await nodeStore.modify(
        savedNodeId,
        {
          properties
        },
        {
          isDebounced: true,
          debounceKey: property.id.toString()
        }
      );
      linkFeedback = {
        message: "Property saved.",
        type: AlertType.SUCCESS
      };
    } catch (error) {
      logger.error({ at: "LinkBoxOnSaver.handlePropertyChange", error });
      linkFeedback = {
        message: "Failed to save property.",
        type: AlertType.ERROR
      };
    }
  }
</script>

<section
  class="flex flex-col gap-4 w-full border border-brs3 rounded-md bg-bgs1 p-2"
>
  <div class={hasLinkedResources ? "px-1 pt-1" : ""}>
    <LinkSearch
      accessPoint={ResourceAccessPoint.CAPTURE}
      bind:searchQuery={linkSearchQuery}
      excludeFromSearch={linkSearchExclusions}
      on:select={handleLinkSelect}
    />
  </div>
  {#if hasLinkedResources}
    <div class="flex flex-col gap-2 overflow-y-auto styledscroll">
      <LinkItems
        accessPoint={ResourceAccessPoint.CLIPPER}
        links={linkedResources}
        nodeId={savedNodeId}
        propertyValues={linkedProperties}
        isExpandable={true}
        bind:expand={expandedLink}
        on:unlink={handleUnlink}
        on:propertyChange={handlePropertyChange}
      />
    </div>
  {/if}
  {#if isLinkboxLoading}
    <InlineFeedbackText
      feedback={{
        message: "Loading links...",
        type: AlertType.PROGRESS
      }}
      size={Size.sm}
    />
  {:else if linkFeedback}
    <InlineFeedbackText
      feedback={linkFeedback}
      size={Size.sm}
      isAutoDissappear={true}
    />
  {/if}
</section>
