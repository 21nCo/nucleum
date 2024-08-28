<script lang="ts">
  import { type IActiveNodeStore } from "../node.store";
  import { resolveIframability } from "$lib/client/utils/browser.utils";
  import { onMount } from "svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { appStore, userPreferences } from "$lib/client/stores/app.store";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import WebPagePreview from "./web/WebPagePreview.svelte";
  import { NodeType } from "../node.type";
  import TweetPreview from "./web/TweetPreview.svelte";
  import WebClipPreview from "./web/WebClipPreview.svelte";
  export let node: IActiveNodeStore;
</script>

<div class="h-full w-full">
  {#if $node.contentType === NodeType.WEB_PAGE}
    <WebPagePreview {node} />
  {:else if $node.contentType === NodeType.TEXT_CLIP || $node.contentType === NodeType.VIDEO_TIMESTAMP_CLIP || $node.contentType === NodeType.WEB_SCREENSHOT_CLIP}
    <WebClipPreview {node} />
  {:else if $node.contentType === NodeType.TWEET}
    <TweetPreview {node} />
  {/if}
  <div class="absolute bottom-0 left-0 m-2 flex gap-2 items-center">
    <Button
      icon="arrow-up-right"
      label={$node.body.url?.split("?")[0]}
      size={Size.xs}
      type={ButtonVariant.PRIMARY}
      style={ButtonStyle.OUTLINED}
      on:click={() => {
        appStore.openLink($node.body.url);
      }}
    />
  </div>
</div>
