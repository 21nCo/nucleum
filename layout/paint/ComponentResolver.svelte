<script lang="ts">
  import { onMount } from "svelte";
  import { resolveComponentFromPath } from "$lib/tidy/utils/utils";
  import { ContentType, type Action } from "$lib/tidy/types/action.type";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import SpaceDocument from "$lib/tidy/components/space/SpaceDocument.svelte";
  import ModalLayout from "$lib/tidy/components/modal/ModalLayout.svelte";
  import context from "$lib/tidy/stores/context.store";
  import { postMessageToParent } from "$lib/tidy/utils/embed.utils";
  import { EmbedMessage } from "$lib/tidy/types/embedMessage.enum";
  export let action: Action | null = null;
  export let path: string = "";
  export let params: any = {};
  onMount(() => {
    if (action === null && path !== "") {
      action = resolveComponentFromPath(path);
    }
    if ($context.isSheet) postMessageToParent(EmbedMessage.SHEET_MOUNTED);
  });
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
  {#if action.link}
    <SpaceDocument
      documentId={action.link.split(":")[1]}
      spaceId={action.link.split(":")[0]}
    />
  {/if}
{:else if $context.isSheet && action}
  <ModalLayout path={action.action} params={action.modalParams ?? {}}>
    <svelte:component this={action?.component} {...params} />
  </ModalLayout>
{:else}
  <svelte:component this={action?.component} {...params} />
{/if}
