<script lang="ts">
  import { onMount } from "svelte";
  import { type IAction } from "@21n/types/action.type";
  import ModalLayout from "@21n/components/modal/ModalLayout.svelte";
  import context from "@21n/stores/context.store";
  import { postMessageToParent } from "@21n/utils/embed.utils";
  import { EmbedMessage } from "@21n/types/embedMessage.enum";
  import { appStore } from "@21n/stores/app.store";
  import PageError from "@21n/components/error/PageError.svelte";
  import { resizeListener } from "@21n/actions/resize.action";
  import { setContext } from "svelte";
  import { writable, type Writable } from "svelte/store";
  import { Context } from "@21n/types/appStore.type";
  import type { IContainer } from "../layout.type";
  const containerStore = writable<IContainer | undefined>(undefined);
  setContext<Writable<IContainer | undefined>>(
    Context.CONTAINER,
    containerStore
  );
  export let action: IAction | null = null;
  export let path: string = "";
  export let params: any = {};
  export let isPreventErrorFeedback: boolean = false;

  let containerElement: HTMLDivElement | undefined;

  function measureContainer(element: HTMLDivElement) {
    const rect = element.getBoundingClientRect();
    containerStore.set({
      width: rect.width,
      height: rect.height,
      landscapiness: rect.width / rect.height,
      isPortrait: rect.width / rect.height < 1
    });
  }

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
    if (containerElement) {
      measureContainer(containerElement);
    }
  });
</script>

{#if $context.isSheet && action}
  <ModalLayout path={action.action} params={action.modalParams ?? {}}>
    <svelte:component this={action?.component} {...params} />
  </ModalLayout>
{:else if action?.component}
  <div
    bind:this={containerElement}
    class="flex justify-center w-full h-full"
    use:resizeListener={(e) => {
      containerStore.set(e);
    }}
  >
    <svelte:component this={action?.component} {...params} />
  </div>
{:else if !isPreventErrorFeedback}
  <PageError isNotFoundPage={true} />
{/if}
