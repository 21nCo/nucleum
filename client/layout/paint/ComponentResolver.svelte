<script lang="ts">
  import { onMount } from "svelte";
  import { ContentType, type IAction } from "@21n/types/action.type";
  import Button from "@21n/elements/button/Button.svelte";
  import { Size } from "@21n/types/size.enum";
  import SpaceDocument from "@21n/components/space/SpaceDocument.svelte";
  import ModalLayout from "@21n/components/modal/ModalLayout.svelte";
  import context from "@21n/stores/context.store";
  import { postMessageToParent } from "@21n/utils/embed.utils";
  import { EmbedMessage } from "@21n/types/embedMessage.enum";
  import { appStore } from "@21n/stores/app.store";
  import PageError from "@21n/components/error/PageError.svelte";
  export let action: IAction | null = null;
  export let path: string = "";
  export let params: any = {};
  export let isPreventErrorFeedback: boolean = false;
  onMount(() => {
    if (action === null && path !== "") {
      action = appStore.resolveComponentFromPath(path);
      if (!action && path.includes("/")) {
        const pathWithPrefixStripped = path.split("/")[1];
        action = appStore.resolveComponentFromPath(pathWithPrefixStripped);
      }
      if (action) {
        params = {
          ...(action.componentParams ?? {}),
          ...(params ?? {})
        };
      }
    }
    if ($context.isSheet) postMessageToParent(EmbedMessage.SHEET_MOUNTED);
  });
  function resolveSpaceDocumentParams(slug: string) {
    if (!slug) return { spaceId: "", documentId: "" };
    if (!slug.includes(":")) {
      slug = $appStore.appData.urls[slug];
    }
    if (!slug || slug.includes("http")) return { spaceId: "", documentId: "" };
    const [spaceId, documentId] = slug.split(":");
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
  <SpaceDocument params={resolveSpaceDocumentParams(action.action)} />
{:else if $context.isSheet && action}
  <ModalLayout path={action.action} params={action.modalParams ?? {}}>
    <svelte:component this={action?.component} {...params} />
  </ModalLayout>
{:else if action?.component}
  <svelte:component this={action?.component} {...params} />
{:else if !isPreventErrorFeedback}
  <PageError isNotFoundPage={true} />
{/if}
