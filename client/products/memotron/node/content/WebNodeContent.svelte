<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import WebPagePreview from "./web/WebPagePreview.svelte";
  import { type IClip, type IWebPage, NodeType } from "../node.type";
  import TweetPreview from "./web/TweetPreview.svelte";
  import WebClipPreview from "./web/WebClipPreview.svelte";
  import YoutubeVideoPreview from "./web/YoutubeVideoPreview.svelte";
  import KindleBookPreview from "./web/KindleBookPreview.svelte";
  import { truncateString } from "$lib/shared/utils/text.utils";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import { PopoverTriggerMethod } from "$lib/client/types/popover.type";
  import type { IContextMenu } from "$lib/client/types/select.type";
  import TwitterProfilePreview from "./web/TwitterProfilePreview.svelte";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import GistPreview from "./web/GistPreview.svelte";
  export let node: IClip | IWebPage;
  export let isLinkHovering: boolean = false;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  let youtubeVideoRef: YoutubeVideoPreview;

  export function onTrace(e: any) {
    youtubeVideoRef.onTrace(e);
  }

  const linkContextMenu: IContextMenu = [
    {
      group: "base",
      items: [
        {
          value: "open-link",
          label: "Open link",
          icon: "arrow-up-right",
          callback: async () => {
            appStore.openLink(node.url ?? "");
          }
        },
        {
          value: "copy-link",
          label: "Copy link",
          icon: "copy",
          callback: async () => {
            navigator.clipboard.writeText(node.url ?? "");
          }
        }
      ]
    }
  ];

  function trimUrl(url: string, isHovering: boolean) {
    url = url.split("?")[0];
    url = url.split("#")[0];
    return truncateString(url, isHovering ? 150 : 50);
  }
</script>

<div class="h-full w-full">
  {#if node.contentType === NodeType.WEB_PAGE}
    <WebPagePreview {node} {accessPoint} />
  {:else if node.contentType === NodeType.GIST}
    <GistPreview {node} {accessPoint} />
  {:else if node.contentType === NodeType.TEXT_CLIP || node.contentType === NodeType.WEB_SCREENSHOT_CLIP || node.contentType === NodeType.KINDLE_HIGHLIGHT}
    <WebClipPreview {node} {accessPoint} />
  {:else if node.contentType === NodeType.TWEET}
    <TweetPreview {node} {accessPoint} />
  {:else if node.contentType === NodeType.TWITTER_PROFILE}
    <TwitterProfilePreview {node} />
  {:else if node.contentType === NodeType.KINDLE_BOOK}
    <KindleBookPreview {node} />
  {:else if (node.contentType === NodeType.YOUTUBE_VIDEO || node.contentType === NodeType.YOUTUBE_TIMESTAMP_CLIP) && node.url}
    <YoutubeVideoPreview
      url={node.url}
      timestamp={node.body && "timestamp" in node.body
        ? node.body.timestamp
        : null}
      bind:this={youtubeVideoRef}
    />
  {/if}
  {#if "url" in node && node.url && accessPoint === ResourceAccessPoint.SELF}
    <div
      class="absolute bottom-0 left-0 m-2 flex gap-2 items-center max-w-full"
    >
      <ContextMenuAction
        id="open-link-context-menu"
        triggerMethod={PopoverTriggerMethod.RIGHT_CLICK}
        menuResolver={() => {
          return linkContextMenu;
        }}
      >
        <Button
          icon="arrow-up-right"
          label={trimUrl(node.url, isLinkHovering)}
          bind:isHovering={isLinkHovering}
          size={Size.xs}
          type={ButtonVariant.PRIMARY}
          style={ButtonStyle.OUTLINED}
          on:click={() => {
            if (!node.url) return;
            appStore.openLink(node.url);
          }}
        />
      </ContextMenuAction>
    </div>
  {/if}
</div>
