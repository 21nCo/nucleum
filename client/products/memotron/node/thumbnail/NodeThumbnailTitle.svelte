<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { INode } from "../../node/node.type";
  import NodeTitleLabelPart from "../title/NodeTitleLabelPart.svelte";
  import NodeAvatar from "../avatar/NodeAvatar.svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { cn } from "$lib/client/utils/ui.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { tooltip } from "$lib/client/actions/popover.action";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  export let node: INode;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let isUrlOnIcon: boolean = false;
  let isHovering = false;
  let isHoveringUrl = false;
  let isHoveringUrlIcon = false;
</script>

<div
  class="flex gap-1 items-center w-full h-6"
  use:hoverable={{
    onHover: (e) => (isHovering = e)
  }}
>
  {#if !isUrlOnIcon && accessPoint !== ResourceAccessPoint.SEARCH_RESULT && isHovering && node.url}
    <a
      href={node.url}
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center gap-1 text-b3 w-full hover:text-aps1"
      on:click={(e) => {
        e.stopPropagation();
      }}
      use:hoverable={{
        onHover: (e) => (isHoveringUrl = e)
      }}
    >
      <Icon
        icon="arrow-up-right"
        size={Size.xs}
        class={cn({
          "fill-fgs3": !isHoveringUrl,
          "fill-aps1": isHoveringUrl
        })}
      />
      <span class="truncate w-full text-left">
        {node.url}
      </span>
    </a>
  {:else}
    <NodeAvatar {node} size={Size.sm} />
    <div class="flex-1 min-w-0">
      <div
        class={cn("flex text-left truncate w-full text-b2 font--medium", {
          "text-h5": accessPoint === ResourceAccessPoint.SEARCH_RESULT,
          "text-b2": accessPoint !== ResourceAccessPoint.SEARCH_RESULT
        })}
      >
        <NodeTitleLabelPart item={node} {accessPoint} />
      </div>
    </div>
    <span
      class="flex items-center gap-1 shrink-0"
      use:hoverable={{
        onHover: (e) => (isHoveringUrlIcon = e)
      }}
    >
      {#if node.url && accessPoint !== ResourceAccessPoint.SEARCH_RESULT}
        {#if !isUrlOnIcon || (isUrlOnIcon && !isHoveringUrlIcon)}
          <Icon icon="ph:arrow-up-right" class="fill-fgs3" size={Size.sm} />
        {:else if isUrlOnIcon && isHoveringUrlIcon}
          <button
            on:click={() => {
              if (!node.url) return;
              appStore.openLink(node.url);
            }}
            use:tooltip={{
              text: node.url
            }}
          >
            <Icon icon="ph:arrow-up-right" class="fill-aps1" size={Size.md} />
          </button>
        {/if}
      {/if}
      {#if node.isStarred && accessPoint !== ResourceAccessPoint.SEARCH_RESULT}
        <Icon icon="star" class="fill-yellow-400" />
      {/if}
    </span>
  {/if}
</div>
