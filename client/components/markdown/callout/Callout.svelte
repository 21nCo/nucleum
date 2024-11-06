<script lang="ts">
  import { popover } from "$lib/client/actions/popover.action";
  import Avatar from "$lib/client/elements/avatarPicker/Avatar.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import { markdownSettings } from "../markdown.settings";
  import type { MdStoreType } from "../markdown.store";
  import type { ICalloutBody, ICalloutSetting } from "../md.type";
  import TextContent from "../content/TextContent.svelte";
  import CalloutSelector from "./CalloutSelector.svelte";
  import { MemotronAction } from "$lib/client/products/memotron/memotronAction.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import { logger } from "../../debug/logger.client";
  import { createEventDispatcher } from "svelte";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  const dispatch = createEventDispatcher();

  export let id: IRecordId;
  export let body: ICalloutBody;
  export let mdStore: MdStoreType;
  export let isHovering: boolean = false;
  let _callout: ICalloutSetting = resolveCallout();
  let ref: HTMLElement;

  function resolveCallout(): ICalloutSetting {
    if (body.callout) {
      const calloutFromSettings = $markdownSettings.callout.find(
        (x) => x.id === body.callout.id
      );
      return calloutFromSettings ?? body.callout;
    } else {
      return $markdownSettings.callout[0];
    }
  }

  function saveCalloutSetting(callout: ICalloutSetting) {
    dispatch("update", {
      callout
    });
  }

  function handleUpdate(e: CustomEvent<string>) {
    dispatch("update", {
      text: e.detail
    });
  }
</script>

<CustomColorPropagator
  color={_callout.color}
  class="flex gap-3 items-start bg-ccs4 border border-ccs2 rounded-md px-2 py-1 text-ccs1"
>
  <div
    class={cn("flex flex-col justify-start p-2 border rounded-md", {
      "border-ccs1": isHovering,
      "border-transparent": !isHovering
    })}
    bind:this={ref}
    use:popover={{
      content: CalloutSelector,
      componentProps: {
        selected: _callout,
        onSelect: (callout) => {
          _callout = callout;
          saveCalloutSetting(callout);
          ref.dispatchEvent(new CustomEvent("hide"));
        },
        onEdit: () => {
          ref.dispatchEvent(new CustomEvent("hide"));
          appStore.runAction(MemotronAction.CALLOUT_SETTINGS);
        }
      }
    }}
  >
    <Avatar avatar={_callout.avatar} />
  </div>
  <div class="w-full">
    <TextContent
      bind:text={body.text}
      on:update={handleUpdate}
      {id}
      contentType={NodeType.CALLOUT}
      {mdStore}
    />
  </div>
</CustomColorPropagator>
