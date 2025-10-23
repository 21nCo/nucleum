<script lang="ts">
  import { logger } from "@21n/components/debug/logger.client";
  import modalEvent from "@21n/components/modal/modal.store";
  import { onMount } from "svelte";
  import { MAX_FILE_SIZE_MB } from "@21n/components/record/record.store";
  import { MemotronAction } from "@21n/products/memotron/memotronAction.enum";
  import { NodeType } from "@21n/products/memotron/node/node.type";
  import { clipboard } from "@21n/products/memotron/capture/capture.store";
  import type { IPasteCaptureData } from "@21n/products/memotron/capture/capture.type";
  import { resolvePasteContents } from "@21n/products/memotron/capture/capture.utils";
  import account from "@21n/stores/account.store";
  import { resourceAction } from "@21n/components/flux/resourceStores/resource.utils";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import {
    ResourceAccessMode,
    ResourceActionType
  } from "@21n/components/flux/resourceStores/resource.type";
  import { generateResourceId } from "@21n/shared-utils/surreal.utils";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { appStore } from "@21n/stores/app.store";
  import ShareContentSaver from "@21n/products/memotron/capture/ShareContentSaver.svelte";

  export let event: ClipboardEvent;

  let id = generateResourceId(Resource.capture);
  let nodeType: NodeType | undefined = undefined;
  let error: string | undefined = undefined;
  let data: IPasteCaptureData | undefined = undefined;
  let saveAsNodeFilesCount: number = 0;
  let isOffline: boolean = false;

  resolveV2(event);

  onMount(async () => {
    isOffline = account.isCloudUserAndOffline();
  });

  async function resolveV2(event: ClipboardEvent) {
    if (!event) return;
    data = await resolvePasteContents(event, {
      maxFileSizeInMb: MAX_FILE_SIZE_MB
    });
    if (!data || data.error) {
      error = data?.error ?? "An error occurred";
      return;
    }
    nodeType = data.contentType;
    if (data.multipleFiles && data.multipleFiles.files?.length > 0) {
      saveAsNodeFilesCount = data.multipleFiles?.files?.filter((file) => {
        return file.contentType !== NodeType.FILE;
      }).length;
    }
  }

  function handleInsertIntoMarkdown() {
    clipboard.set({
      ...data,
      contentType: data?.contentType ?? NodeType.SIMPLE_TEXT
    });
    modalEvent.hide(MemotronAction.PASTE_CONFIRMATION);
    appStore.runAction(
      resourceAction(Resource.node, ResourceActionType.CREATE),
      {
        searchParams: {
          [AppSearchParam.CLIPBOARD]: true
        },
        componentParams: {
          captureId: id
        }
      }
    );
  }

  function handleSaved() {
    // modalEvent.hide(MemotronAction.PASTE_CONFIRMATION);
  }

  function handleOpen(event: CustomEvent) {
    const { nodeId } = event.detail;
    if (nodeId) {
      appStore.openResource(nodeId, ResourceAccessMode.POP);
    }
    modalEvent.hide(MemotronAction.PASTE_CONFIRMATION);
  }

  function handleClose() {
    modalEvent.hide(MemotronAction.PASTE_CONFIRMATION);
  }
</script>

{#if data}
  <ShareContentSaver
    {data}
    {nodeType}
    {error}
    {isOffline}
    {saveAsNodeFilesCount}
    isShowInsertIntoMarkdown={true}
    on:saved={handleSaved}
    on:open={handleOpen}
    on:close={handleClose}
    on:insertIntoMarkdown={handleInsertIntoMarkdown}
  />
{/if}
