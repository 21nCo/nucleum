<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import type { INode, INodeThumb } from "@21n/products/memotron/node/node.type";
  import NodeTitleLabelPart from "@21n/products/memotron/node/title/NodeTitleLabelPart.svelte";
  import { hoverable } from "@21n/actions/hover.action";
  import { cn } from "@21n/utils/ui.utils";
  import { appStore } from "@21n/stores/app.store";
  import { tooltip } from "@21n/actions/popover.action";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import view from "@21n/stores/view.store";
  import RecordStarStatusFeedback from "@21n/components/record/RecordStarStatusFeedback.svelte";
  let {
    node,
    accessPoint = ResourceAccessPoint.BROWSER,
    isUrlOnIcon = false
  }: {
    node: INode;
    accessPoint?: ResourceAccessPoint;
    isUrlOnIcon?: boolean;
  } = $props();
  let isHovering = false;
  let isHoveringUrl = false;
  let isHoveringUrlIcon = false;

  function resolveNodeThumb() {
    return node as INodeThumb;
  }
</script>

<div
  class="flex gap-1 items-center w-full h-6 userdata"
  use:hoverable={{
    onHover: (e) => (isHovering = e)
  }}
>
  {#if !isUrlOnIcon && isHovering && node.url}
    <button
      class="flex items-center gap-1 text-b3 w-full hover:text-aps1 hover:underline"
      onclick={(e) => {
        e.stopPropagation();
        if (!node.url) return;
        appStore.openLink(node.url);
      }}
      use:hoverable={{
        onHover: (e) => (isHoveringUrl = e)
      }}
    >
      <Icon
        icon="weblink"
        size={Size.xs}
        class={cn({
          "fill-fgs3": !isHoveringUrl,
          "fill-aps1": isHoveringUrl
        })}
      />
      <span class="truncate w-full text-left">
        {node.url}
      </span>
    </button>
  {:else}
    <div class="flex-1 min-w-0">
      <div class={cn("flex text-left truncate w-full text-b2 font--medium")}>
        <NodeTitleLabelPart item={resolveNodeThumb()} {accessPoint} />
      </div>
    </div>
    <span
      class="flex items-center gap-1 shrink-0"
      use:hoverable={{
        onHover: (e) => (isHoveringUrlIcon = e)
      }}
    >
      {#if node.url && !$view.isConstrainedWidth}
        {#if !isUrlOnIcon || (isUrlOnIcon && !isHoveringUrlIcon)}
          <Icon icon="weblink" class="fill-fgs3" size={Size.sm} />
        {:else if isUrlOnIcon && isHoveringUrlIcon}
          <button
            onclick={() => {
              if (!node.url) return;
              appStore.openLink(node.url);
            }}
            use:tooltip={{
              text: node.url
            }}
          >
            <Icon icon="weblink" class="fill-aps1" size={Size.md} />
          </button>
        {/if}
      {/if}
      <RecordStarStatusFeedback isStarred={node.isStarred} />
    </span>
  {/if}
</div>
