<script lang="ts">
  import { popover } from "$lib/client/actions/popover.action";
  import Avatar from "$lib/client/elements/avatarPicker/Avatar.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import { markdownSettings } from "../markdown.settings";
  import type { MdStoreType } from "../markdown.store";
  import { BlockAction, type IBlock } from "../md.type";
  import TextContent from "../content/TextContent.svelte";
  import CalloutSelector from "./CalloutSelector.svelte";
  import { MemotronAction } from "$lib/client/products/memotron/memotronAction.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import { logger } from "../../debug/logger.client";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let mdStore: MdStoreType;
  export let block: IBlock;
  export let isHovering: boolean = false;
  let _callout = resolveCallout();
  let ref: HTMLElement;

  function resolveCallout() {
    if ("metadata" in block && block.metadata && "callout" in block.metadata) {
      const calloutFromSettings = $markdownSettings.callout.find(
        (x) => x.id === block.metadata.callout.id
      );
      return calloutFromSettings ?? block.metadata.callout;
    } else {
      return $markdownSettings.callout[0];
    }
  }

  function assignCallout(callout: any) {
    dispatch("update", {
      metadata: {
        callout
      }
    });
    block.metadata = { callout };
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
          assignCallout(callout);
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
    <TextContent {block} {mdStore} />
  </div>
</CustomColorPropagator>
