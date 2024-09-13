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
  export let node: IClip | IWebPage;
</script>

<div class="h-full w-full">
  {#if node.contentType === NodeType.WEB_PAGE}
    <WebPagePreview {node} />
  {:else if node.contentType === NodeType.TEXT_CLIP || node.contentType === NodeType.WEB_SCREENSHOT_CLIP || node.contentType === NodeType.KINDLE_HIGHLIGHT}
    <WebClipPreview {node} />
  {:else if node.contentType === NodeType.TWEET}
    <TweetPreview {node} />
  {:else if node.contentType === NodeType.KINDLE_BOOK}
    <KindleBookPreview {node} />
  {:else if node.contentType === NodeType.YOUTUBE_VIDEO || node.contentType === NodeType.YOUTUBE_TIMESTAMP_CLIP}
    <YoutubeVideoPreview {node} />
  {/if}
  <div class="absolute bottom-0 left-0 m-2 flex gap-2 items-center">
    <Button
      icon="arrow-up-right"
      label={node.body.url?.split("?")[0]}
      size={Size.xs}
      type={ButtonVariant.PRIMARY}
      style={ButtonStyle.OUTLINED}
      on:click={() => {
        appStore.openLink(node.body.url);
      }}
    />
  </div>
</div>
