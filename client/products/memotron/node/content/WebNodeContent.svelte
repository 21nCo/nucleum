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

<div class="flex gap-6 w-full h-full">
  <main class="relative h-full flex-1 border-r border-brs3">
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
  </main>
  <aside
    class="flex flex-col gap-4 justify-center items-center w-3/10 w--80 2k:w--96"
  >
    <!-- <Button
        icon="arrow-up-right"
        label="Open link"
        size={Size.sm}
        type={ButtonVariant.PRIMARY}
        style={ButtonStyle.OUTLINED}
        on:click={() => {
          appStore.openLink($node.body.url);
        }}
      /> -->
    <!-- <div>
        <button
          class="flex gap-2 items-center rounded-full border border-brs3 px-4 py-2 hover:bg-bgs2"
        >
          <Icon icon="bookmark" />
          <span> Highlights </span>
          <span
            class="bg-bgs2 border border-brs2 w-4 h-4 rounded-md text-b4 text-fgs3"
          >
            {$node.clips?.length}
          </span>
        </button>
      </div> -->
    <!-- <div class="text-b3 text-fgs3 mt-2">
        Clipped at {formatDatetime($userPreferences, $node.createdAt)}
      </div> -->
  </aside>
</div>
