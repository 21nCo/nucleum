<script lang="ts">
  import LinkItems from "@21n/products/memotron/common/linkbox/LinkItems.svelte";
  import LinkSearch from "@21n/products/memotron/common/linkbox/LinkSearch.svelte";
  import InlineFeedbackText from "@21n/extensions/clipper/InlineFeedbackText.svelte";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import {
    AlertType,
    type IInlineStatus
  } from "@21n/types/notification.type";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import {
    determineResourceType,
    isSameResource
  } from "@21n/components/flux/resourceStores/resource.utils";
  import type { ICollectionItemPropertyValue } from "@21n/components/collection/collection.type";
  import type { IRecordId } from "@21n/types/data.type";
  import type {
    INodeThumb,
    INodeLinkThumb
  } from "@21n/products/memotron/node/node.type";
  import { linker } from "@21n/products/memotron/linking/link.store";
  import { LinkType } from "@21n/products/memotron/linking/link.type";
  import { nodeStore } from "@21n/products/memotron/node/node.store";
  import { ResourceError } from "@21n/components/error/errors";
  import { ResourceErrorCode } from "@21n/components/error/error.type";
  import { logger } from "@21n/components/debug/logger.client";
  import { Size } from "@21n/types/size.enum";

  let {
    savedNodeId,
    savedNode,
    expandedLink = $bindable(null),
    onSavedNodeChange = undefined
  }: {
    savedNodeId?: IRecordId | undefined;
    savedNode?: INodeThumb | undefined;
    expandedLink?: IRecordId | null;
    onSavedNodeChange?:
      | ((detail: { savedNode: LinkedNodeThumb }) => void)
      | undefined;
  } = $props();

  type LinkedNodeThumb = INodeThumb & {
    links?: INodeLinkThumb[];
    collections?: IRecordId[];
    properties?: ICollectionItemPropertyValue[];
  };

  let linkSearchQuery = $state("");
  let linkedResources = $state<IRecordId[]>([]);
  let linkedProperties = $state<ICollectionItemPropertyValue[]>([]);
  let linkFeedback = $state<IInlineStatus | undefined>(undefined);
  let isLinkboxLoading = $state(false);

  let lastRefreshedId: string | undefined;
  const linkSearchExclusions = $derived([
    ...(linkedResources ?? []),
    ...(savedNodeId ? [savedNodeId] : [])
  ].filter(Boolean) as IRecordId[]);

  const hasLinkedResources = $derived(linkedResources.length > 0);

  $effect(() => {
    if (savedNodeId) {
      const nodeIdStr = savedNodeId.toString();
      if (lastRefreshedId !== nodeIdStr) {
        lastRefreshedId = nodeIdStr;
        refreshLinkedData(savedNodeId).catch((error) => {
          logger.error({ at: "LinkBoxOnSaver.reactiveRefresh", error });
        });
      }
      return;
    }

    linkedResources = [];
    linkedProperties = [];
    expandedLink = null;
    lastRefreshedId = undefined;
  });

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

      const collections = (nodeResult?.collections ?? []) as IRecordId[];
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
        !aggregated.some((id) => isSameResource(id, expandedLink as IRecordId))
      ) {
        expandedLink = null;
      }

      const updatedNode: LinkedNodeThumb | undefined = nodeResult
        ? ({
            ...(nodeResult as INodeThumb),
            links: directLinks,
            collections,
            properties
          } as LinkedNodeThumb)
        : savedNode
          ? ({
              ...(savedNode as INodeThumb),
              links: directLinks,
              collections,
              properties
            } as LinkedNodeThumb)
          : undefined;

      if (updatedNode) {
        savedNode = updatedNode;
        onSavedNodeChange?.({ savedNode: updatedNode });
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
        onSavedNodeChange?.({ savedNode });
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
      onSelect={handleLinkSelect}
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
        onUnlink={handleUnlink}
        onPropertyChange={handlePropertyChange}
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
