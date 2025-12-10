<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { appStore } from "@21n/stores/app.store";
  import { Size } from "@21n/types/size.enum";
  import WebPagePreview from "@21n/products/memotron/node/content/web/WebPagePreview.svelte";
  import {
    type IClip,
    type IWebPage,
    NodeType,
    socialPostNodeTypeList,
    socialProfileNodeTypeList,
    socialSubNodeTypeList
  } from "@21n/products/memotron/node/node.type";
  import SocialPostContent from "@21n/products/memotron/node/content/web/social/SocialPostContent.svelte";
  import SocialProfileContent from "@21n/products/memotron/node/content/web/social/SocialProfileContent.svelte";
  import WebClipPreview from "@21n/products/memotron/node/content/web/WebClipPreview.svelte";
  import YoutubeVideoPreview from "@21n/products/memotron/node/content/web/YoutubeVideoPreview.svelte";
  import KindleBookPreview from "@21n/products/memotron/node/content/web/KindleBookPreview.svelte";
  import { truncateString } from "@21n/shared-utils/text.utils";
  import ContextMenuAction from "@21n/elements/contextMenu/ContextMenuAction.svelte";
  import { PopoverTriggerMethod } from "@21n/types/popover.type";
  import type { IContextMenu } from "@21n/types/select.type";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import GistPreview from "@21n/products/memotron/node/content/web/GistPreview.svelte";
  import SocialSubContent from "@21n/products/memotron/node/content/web/social/SocialSubContent.svelte";
  export let node: IClip | IWebPage;
  export let isLinkHovering: boolean = false;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  const dev_isShowCopyLinkAction = false;
  let youtubeVideoRef: YoutubeVideoPreview;
  let copyLabel: string = "Copy link";
  let copyTimeoutId: ReturnType<typeof setTimeout> | null = null;
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
          icon: "weblink",
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
</script>

<div class="relative h-full w-full flex flex-col flex-col-reverse">
  {#if node.contentType === NodeType.WEB_PAGE || node.contentType === NodeType.YOUTUBE_CHANNEL}
    <WebPagePreview {node} {accessPoint} />
  {:else if node.contentType === NodeType.GIST}
    <GistPreview {node} {accessPoint} />
  {:else if node.contentType === NodeType.WEB_TEXT_BOOKMARK || node.contentType === NodeType.WEB_SCREENSHOT || node.contentType === NodeType.KINDLE_HIGHLIGHT}
    <WebClipPreview {node} {accessPoint} />
  {:else if socialPostNodeTypeList.has(node.contentType)}
    <SocialPostContent {node} {accessPoint} />
  {:else if socialProfileNodeTypeList.has(node.contentType)}
    <SocialProfileContent {node} />
  {:else if socialSubNodeTypeList.has(node.contentType)}
    <SocialSubContent {node} />
  {:else if node.contentType === NodeType.KINDLE_BOOK}
    <KindleBookPreview {node} />
  {:else if (node.contentType === NodeType.YOUTUBE_VIDEO || node.contentType === NodeType.YOUTUBE_SHORT || node.contentType === NodeType.YOUTUBE_BOOKMARK) && node.url}
    <YoutubeVideoPreview
      url={node.url}
      timestamp={node.body && "timestamp" in node.body
        ? node.body.timestamp
        : null}
      bind:this={youtubeVideoRef}
    />
  {/if}
  {#if dev_isShowCopyLinkAction && "url" in node && node.url && accessPoint === ResourceAccessPoint.SELF && !socialPostNodeTypeList.has(node.contentType)}
    <!-- TODO - TIDY-10 -->
    <div
      class="flex items-center max-w-full w-full border-b cw:border-y border-brs2 text-fgs3 text-b2 truncate cw:mb-10"
    >
      <!-- <ContextMenuAction
        id="open-link-context-menu"
        triggerMethod={PopoverTriggerMethod.RIGHT_CLICK}
        menuResolver={() => {
          return linkContextMenu;
        }}
      > -->
      <button
        class="flex border-r border-brs2 px-3 py-1.5 hover:bg-aps2-striped hover:text-aps1 truncate min-w-0 flex-1"
        title="Open link"
        on:click={() => {
          if (!node.url) return;
          appStore.openLink(node.url);
        }}
      >
        {node.url?.split("?")?.[0]?.split("#")?.[0]}
      </button>
      <!-- </ContextMenuAction> -->
      <button
        class="flex px-3 py-1.5 hover:bg-bgs2-striped"
        on:click={() => {
          if (!node.url) return;
          navigator.clipboard.writeText(node.url);
          copyLabel = "Copied!";
          if (copyTimeoutId !== null) {
            clearTimeout(copyTimeoutId);
          }
          copyTimeoutId = setTimeout(() => {
            copyLabel = "Copy link";
            copyTimeoutId = null;
          }, 1000);
        }}
      >
        {copyLabel}
      </button>
    </div>
  {/if}
</div>
