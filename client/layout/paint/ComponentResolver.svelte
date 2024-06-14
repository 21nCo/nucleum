<script lang="ts">
  import { onMount } from "svelte";
  import { ContentType, type IAction } from "$lib/client/types/action.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import SpaceDocument from "$lib/client/components/space/SpaceDocument.svelte";
  import ModalLayout from "$lib/client/components/modal/ModalLayout.svelte";
  import context from "$lib/client/stores/context.store";
  import { postMessageToParent } from "$lib/client/utils/embed.utils";
  import { EmbedMessage } from "$lib/client/types/embedMessage.enum";
  import { appStore } from "$lib/client/stores/app.store";
  export let action: IAction | null = null;
  export let path: string = "";
  export let params: any = {};
  onMount(() => {
    if (action === null && path !== "") {
      action = appStore.resolveComponentFromPath(path);
    }
    if ($context.isSheet) postMessageToParent(EmbedMessage.SHEET_MOUNTED);
  });
  function resolveSpaceDocumentParams(link: string) {
    if (!link) return { spaceId: "", documentId: "" };
    if (!link.includes(":")) {
      link = $appStore.appData.urls[link];
      console.log({ link, urls: $appStore.appData.urls });
    }
    if (!link || link.includes("http")) return { spaceId: "", documentId: "" };
    const [spaceId, documentId] = link.split(":");
    return { spaceId, documentId };
  }
</script>

{#if action?.contentType === ContentType.BUTTON}
  <Button
    size={Size.sm}
    label={action?.label}
    on:click={() => {
      if (action?.fn) action?.fn();
    }}
  />
{:else if action?.contentType === ContentType.SPACE_DOC}
  <SpaceDocument
    params={resolveSpaceDocumentParams(action.link ?? action.action)}
  />
{:else if $context.isSheet && action}
  <ModalLayout path={action.action} params={action.modalParams ?? {}}>
    <svelte:component this={action?.component} {...params} />
  </ModalLayout>
{:else}
  <svelte:component this={action?.component} {...params} />
{/if}
