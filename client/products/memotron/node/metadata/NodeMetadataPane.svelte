<script lang="ts">
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { enumToString, formatBytes } from "$lib/shared/utils/text.utils";
  import type { IActiveNodeStore } from "../node.store";
  import { headingNodeTypes, NodeType, webNodeTypeList } from "../node.type";
  import BasicInfoItem from "./BasicInfoItem.svelte";
  import InfoCard from "./InfoCard.svelte";
  import LocationCard from "./LocationCard.svelte";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  import { accessLogStore } from "$lib/client/components/accessLogging/accesslog.store";
  import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { IAccessLog } from "$lib/client/components/accessLogging/accessLog.type";
  import { page } from "$app/stores";
  import { logger } from "$lib/client/components/debug/logger.client";
  export let node: IActiveNodeStore;
  export let renderingDetails: any = undefined;
  let lastAccessLog: IAccessLog | undefined = undefined;
  let viewLogs: IAccessLog[] | undefined = undefined;
  $: kind = resolveKind($node.contentType);
  $: isMediaNode =
    $node.contentType !== NodeType.NODULAR_MARKDOWN &&
    $node.contentType !== NodeType.NON_NODULAR_MARKDOWN &&
    $node.contentType !== NodeType.PDF;
  $: isWebNode = webNodeTypeList.includes($node.contentType);

  function resolveKind(contentType: NodeType) {
    if (
      headingNodeTypes.includes(contentType) ||
      contentType === NodeType.NODULAR_MARKDOWN ||
      contentType === NodeType.NON_NODULAR_MARKDOWN
    )
      return "Markdown";
    else return enumToString(contentType);
  }

  function calculateReadingTime(wordCount: number | undefined) {
    if (!wordCount) return "NA";
    const minutes = wordCount / 200;
    if (minutes < 1) {
      return "Less than a minute";
    } else if (minutes < 60) {
      return `${Math.round(minutes)} minute${minutes >= 1.5 ? "s" : ""}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);
      return `${hours} hour${hours > 1 ? "s" : ""} ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}`;
    }
  }

  function resolveFileFormat(fileType: string) {
    if (!fileType) return "NA";
    if (fileType.includes("image/jpeg")) return "jpeg";
    else if (fileType.includes("image/png")) return "png";
    else if (fileType.includes("image/gif")) return "gif";
    else if (fileType.includes("image/svg+xml")) return "svg";
    else if (fileType.includes("video/mp4")) return "mp4";
    else if (fileType.includes("video/quicktime")) return "quicktime";
    else if (fileType.includes("video/x-msvideo")) return "avi";
    else if (fileType.includes("video/x-ms-wmv")) return "wmv";
    else if (fileType.includes("video/x-flv")) return "flv";
    else if (fileType.includes("audio/mpeg")) return "mp3";
    else if (fileType.includes("audio/mp3")) return "mp3";
    else if (fileType.includes("audio/x-wav")) return "wav";
    else if (fileType.includes("audio/x-ms-wma")) return "wma";
    else if (fileType.includes("audio/webm")) return "webm";
    else return "NA";
  }

  onMount(async () => {
    await initAccessLogs();
  });

  async function initAccessLogs() {
    try {
      const currentAccess = $node.accessMode + "At";
      const currentAccessId = $page.url.searchParams.get(currentAccess);
      const accessLogs = await accessLogStore.fetch($node.id);
      logger.log({
        at: "NodeMetadataPane.svelte:initAccessLogs",
        accessLogs
      });
      if (accessLogs && accessLogs.length > 0) {
        viewLogs = accessLogs
          .filter((x) => x.action === ResourceActionType.OPEN)
          .sort((a, b) => b.createdAt - a.createdAt);
        if (viewLogs.length === 0) return;
        if (
          currentAccessId &&
          new Date(viewLogs[0].timestamp).getTime() ===
            parseInt(currentAccessId)
        ) {
          lastAccessLog = viewLogs[1];
        } else {
          lastAccessLog = viewLogs[0];
        }
      }
    } catch (e) {
      logger.error({ at: "NodeMetadataPane.svelte:initAccessLogs", error: e });
    }
  }
</script>

<div class="flex flex-col gap-3 w-full flex-grow items-start">
  <div class={cn("flex w-full flex-col gap-3")}>
    <div class={cn("flex flex-col gap-3 rounded-md mo:p-2 p-4 w-full bg-bgs2")}>
      <BasicInfoItem label="Kind" value={kind} />
      {#if isMediaNode && !isWebNode && "file" in $node}
        <BasicInfoItem
          label="File format"
          value={$node.file?.type ? resolveFileFormat($node.file.type) : "NA"}
        />
        <BasicInfoItem
          label="Storage size"
          value={$node.file?.size ? formatBytes($node.file.size) : "NA"}
        />
        {#if $node.contentType === NodeType.IMAGE}
          <BasicInfoItem
            label="Rendered resolution"
            value={renderingDetails?.renderedHeight
              ? renderingDetails?.renderedHeight +
                " x " +
                renderingDetails?.renderedWidth
              : "NA"}
          />
          <BasicInfoItem
            label="Original resolution"
            value={renderingDetails?.originalHeight
              ? renderingDetails?.originalHeight +
                " x " +
                renderingDetails?.originalWidth
              : "NA"}
          />
        {/if}
      {/if}
      <BasicInfoItem
        label={isWebNode ? "Clipped at" : "Created at"}
        value={$node.createdAt}
      />
      {#if lastAccessLog}
        <BasicInfoItem
          label="Last viewed at"
          value={lastAccessLog?.createdAt}
        />
      {/if}
      {#if !isWebNode}
        <BasicInfoItem label="Last modified at" value={$node.modifiedAt} />
      {/if}
    </div>
    {#if $node.contentType === NodeType.AUDIO && $node.metadata}
      <div class="flex flex-col gap-3 rounded-md mo:p-2 p-4 w-full bg-bgs2">
        <BasicInfoItem
          label="Duration"
          value={$node.file?.duration
            ? (formatSeconds($node.file.duration) ?? "NA")
            : $node.metadata.duration
              ? formatSeconds($node.metadata.duration)
              : "NA"}
        />
        {#if $node.metadata?.title}
          <BasicInfoItem label="Title" value={$node.metadata?.title} />
        {/if}
        {#if $node.metadata?.album}
          <BasicInfoItem label="Album" value={$node.metadata?.album} />
        {/if}
        {#if $node.metadata?.artist}
          <BasicInfoItem label="Artist" value={$node.metadata?.artist} />
        {/if}
        {#if $node.metadata?.genre}
          <BasicInfoItem label="Genre" value={$node.metadata?.genre} />
        {/if}
        {#if $node.metadata?.composer}
          <BasicInfoItem label="Composer" value={$node.metadata?.composer} />
        {/if}
        {#if $node.metadata?.year}
          <BasicInfoItem label="Year" value={$node.metadata?.year} />
        {/if}
        {#if $node.metadata?.sampleRate}
          <BasicInfoItem
            label="Sample rate"
            value={$node.metadata?.sampleRate}
          />
        {/if}
        {#if $node.metadata?.bitrate}
          <BasicInfoItem label="Bitrate" value={$node.metadata?.bitrate} />
        {/if}
        {#if $node.metadata?.numberOfChannels}
          <BasicInfoItem
            label="Channels"
            value={$node.metadata?.numberOfChannels}
          />
        {/if}
        {#if $node.metadata?.codec}
          <BasicInfoItem label="Codec" value={$node.metadata?.codec} />
        {/if}
        {#if $node.metadata?.copyright}
          <BasicInfoItem label="Copyright" value={$node.metadata?.copyright} />
        {/if}
      </div>
    {/if}
    <div class="flex flex-wrap gap-3">
      {#if viewLogs && viewLogs.length > 0}
        <InfoCard label="Total view count" value={viewLogs.length} />
      {/if}
      {#if !isMediaNode}
        <InfoCard label="Word count" value={$node.wordCount} />
        <InfoCard
          label="Reading length"
          value={calculateReadingTime($node.wordCount)}
        />
      {/if}
    </div>
    {#if $node.metadata?.location}
      <div class={cn("rounded-md w-full bg-bgs2")}>
        <LocationCard metadata={$node.metadata} />
      </div>
    {/if}
  </div>
</div>
