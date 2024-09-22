<script lang="ts">
  import FileView from "$lib/client/components/files/FileView.svelte";
  import {
    ResourceAccessMode,
    type OmitForCapture
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import CheckboxInput from "$lib/client/elements/toggle/CheckboxInput.svelte";
  import {
    extractFullTabData,
    resolveContentTypeForUrl
  } from "$lib/client/extensions/clipper/clipper.utils";
  import account from "$lib/client/stores/account.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import { UserDataMode } from "$lib/client/types/account.type";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { performApiCall } from "$lib/client/utils/network.utils";
  import { MemotronAction } from "../memotronAction.enum";
  import { nodeStore } from "../node/node.store";
  import { NodeType, type IMediaNode, type IWebPage } from "../node/node.type";
  import { resolveNodeContentLabel, resolveNodeIcon } from "../node/node.utils";
  export let event: ClipboardEvent;
  let nodeType: NodeType | undefined = undefined;
  const unsupportedNodeTypes = [NodeType.TWITTER_PROFILE, NodeType.TWEET];
  let nodeTypeLabel: string | undefined = undefined;
  let file: File | undefined = undefined;
  let files: { file: File; contentType: NodeType }[] | undefined = undefined;
  let totalFilesCount: number = 0;
  let incompatibleFormats: string[] = [];
  let text: string | undefined = undefined;
  let isSaveInProgress: boolean = false;
  let isOpenOnSave: boolean = false;
  let isRememberChoice: boolean = false;
  let dev_isEnableChoice: boolean = false;

  $: if (nodeType) nodeTypeLabel = resolveNodeContentLabel(nodeType);
  resolve(event);

  function resolve(event: ClipboardEvent) {
    if (!event) return;
    const filesData = event?.clipboardData?.files;
    text = event?.clipboardData?.getData("text");
    if (text) {
      if (text.startsWith("http")) {
        nodeType = resolveContentTypeForUrl(text);
      } else {
        nodeType = NodeType.SIMPLE_TEXT;
      }
    } else if (filesData && filesData.length === 1) {
      file = filesData[0];
      nodeType = resolveContentTypeForFile(file);
    } else if (filesData && filesData.length > 1) {
      let allFiles = Array.from(filesData);
      totalFilesCount = allFiles.length;
      let allFilesWithType = allFiles.map((file) => {
        return {
          file,
          contentType: resolveContentTypeForFile(file)
        };
      });

      files = allFilesWithType.filter((file) => file.contentType !== undefined);
      incompatibleFormats = Array.from(
        new Set(
          allFilesWithType
            .filter((file) => file.contentType === undefined)
            .map((file) => file.file.name.split(".").pop())
        )
      ).filter((file) => file !== undefined);
    }
  }

  async function onSaveAsNode() {
    if (text) {
      await saveWebpage();
    } else if (file) {
      await saveFile();
    } else if (files && files.length > 1) {
      await saveFiles();
    }
  }

  async function saveWebpage() {
    try {
      if (!text) return;
      isSaveInProgress = true;
      let node: OmitForCapture<IWebPage> = {
        contentType: NodeType.WEB_PAGE,
        label: text.split("://").pop(),
        url: text,
        body: {
          hash: "",
          description: ""
        }
      };
      if ($account.dataMode === UserDataMode.CLOUD) {
        const response = await performApiCall("utils/n/run", "POST", {
          url: text,
          action: "get-webpage"
        });
        const data = await response.json();
        if (data?.text) {
          const parsedData = await parseHtml(data.text);
          console.log("parsed html", parsedData);
          node.label = parsedData.label ?? node.label;
          node.url = parsedData.url ?? node.url;
          node.contentType = parsedData.contentType ?? node.contentType;
          node.body.description =
            parsedData.body.description ?? node.body.description;
          node.body.hash = parsedData.body.hash ?? node.body.hash;
          node.metadata = {
            ...parsedData.metadata
          };
        }
      }
      const result = await nodeStore.create([node]);
      postSave(result);
    } catch (error) {
      postSave(null);
    } finally {
      isSaveInProgress = false;
    }

    function parseHtml(html: string) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      return extractFullTabData(doc, {
        docText: html,
        url: text
      });
    }
  }

  function postSave(result: any) {
    isSaveInProgress = false;
    if (!result || result.error) {
      if (result?.error) toasts.error(result.error);
      else toasts.error("Something went wrong. Please try again later.");
      return;
    }
    modalEvent.hide(MemotronAction.PASTE_CONFIRMATION);
    if (files && files.length > 1) {
      toasts.success(`${files.length} nodes saved successfully!`);
    } else {
      toasts.success("Node saved successfully!");
    }
    const nodeId = result?.[0]?.[0]?.id;
    if (isOpenOnSave && nodeId) {
      appStore.openResource(nodeId, ResourceAccessMode.POP);
    }
  }

  async function saveFile() {
    if (!file) return;
    isSaveInProgress = true;
    const response = await account.uploadFileV2(
      file.type,
      file.name,
      new Blob([file], { type: file.type })
    );
    if (!response) return;
    if (!response[0].id) return;
    const fileId = response[0].id;
    const node = {
      contentType: nodeType,
      file: fileId,
      label: file.name
    } as IMediaNode;
    const result = await nodeStore.create([node]);
    postSave(result);
  }

  function resolveContentTypeForFile(file: File) {
    let nodeType: NodeType | undefined = undefined;
    if (file.type.includes("image")) {
      nodeType = NodeType.IMAGE;
    } else if (file.type.includes("video")) {
      nodeType = NodeType.VIDEO;
    } else if (file.type.includes("audio")) {
      nodeType = NodeType.AUDIO;
    } else if (file.type.includes("pdf")) {
      nodeType = NodeType.PDF;
    }
    return nodeType;
  }

  async function saveFiles() {
    if (!files) return;
    isSaveInProgress = true;
    let nodes: OmitForCapture<IMediaNode>[] = [];
    for (const item of files) {
      if (!item.contentType) continue;
      const response = await account.uploadFileV2(
        item.file.type,
        item.file.name,
        new Blob([item.file], { type: item.file.type })
      );
      if (!response) continue;
      if (!response[0].id) continue;
      const fileId = response[0].id;
      const node = {
        contentType: item.contentType,
        file: fileId,
        label: item.file.name
      } as IMediaNode;
      nodes.push(node);
    }
    //TODO - show if any files are omitted on success message, and also show nodes saved instead for plural
    const result = await nodeStore.create(nodes);
    postSave(result);
  }

  function resolvePasteResolutionMessage() {
    if (nodeTypeLabel) return `${nodeTypeLabel} detected`;
    if (totalFilesCount)
      return `${totalFilesCount} files detected. ${files?.length} can be saved.`;
    return "Nothing";
  }

  function onInsertIntoMarkdown() {
    modalEvent.hide(MemotronAction.PASTE_CONFIRMATION);
    appStore.runAction(MemotronAction.CAPTURE);
    appStore.toggleSearchParam("clipboard", true);
  }
</script>

<div class="flex flex-col justify-between items-center w-full h-full">
  <div
    class="flex flex-col gap-2 items-center justify-center h-32 w-full rounded-md bg-bgs2 p-2"
  >
    {#if file}
      <FileView
        blob={new Blob([file], { type: file.type })}
        class="h-20 object-cover rounded-md"
      />
    {/if}
    {#if text}
      <div class="flex flex-col w-full">
        <span class="text-b3 text-fgs3 truncate w-full">{text}</span>
      </div>
    {/if}
    <span class="flex gap-2 items-center">
      {#if nodeType}
        <Icon icon={resolveNodeIcon(nodeType)} />
      {/if}
      {resolvePasteResolutionMessage()}
    </span>
    {#if incompatibleFormats.length > 0}
      <span class="text-b3 text-fgs3">
        Unsupported formats: {incompatibleFormats.join(", ")}
      </span>
    {/if}
  </div>
  <div class="flex flex-col gap-3 w-60 flex-1 items-center justify-center">
    {#if nodeType && unsupportedNodeTypes.includes(nodeType)}
      <span>Direct <b>{nodeTypeLabel}</b> saving is not supported yet.</span>
    {:else}
      {#if nodeType && nodeType !== NodeType.SIMPLE_TEXT}
        <Button
          label="Save and open"
          icon="ph:arrow-up-right-light"
          isLoading={isSaveInProgress && isOpenOnSave}
          isExpandToFullWidth={true}
          type={ButtonVariant.PRIMARY}
          on:click={() => {
            isOpenOnSave = true;
            onSaveAsNode();
          }}
        />
        <Button
          label="Save as node"
          icon="ph:arrow-right-light"
          isLoading={isSaveInProgress && !isOpenOnSave}
          isExpandToFullWidth={true}
          on:click={onSaveAsNode}
        />
      {/if}
      {#if files && files.length > 1}
        <Button
          label="Save {files.length} nodes"
          icon="ph:arrow-right-light"
          isLoading={isSaveInProgress && !isOpenOnSave}
          isExpandToFullWidth={true}
          type={ButtonVariant.PRIMARY}
          on:click={onSaveAsNode}
        />
      {/if}
      <Button
        label="Insert into markdown"
        icon="ph:markdown-logo-light"
        on:click={onInsertIntoMarkdown}
        isExpandToFullWidth={true}
      />
      {#if dev_isEnableChoice}
        <div class="flex w-full justify-center mt-2">
          <CheckboxInput
            label="Remember my choice"
            width="!w-40"
            bind:checked={isRememberChoice}
          />
        </div>
      {/if}
    {/if}
  </div>
</div>
