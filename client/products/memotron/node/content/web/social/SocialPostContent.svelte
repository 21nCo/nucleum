<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { getContext, onMount } from "svelte";
  import { NodeType } from "../../../node.type";
  import type { INode } from "../../../node.type";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import TweetPreviewUsingWidget from "./TweetPreviewUsingWidget.svelte";
  import InstagramPostWidget from "./InstagramPostWidget.svelte";
  import LinkedInPostWidget from "./LinkedInPostWidget.svelte";
  import RedditPostWidget from "./RedditPostWidget.svelte";
  import FacebookPostWidget from "./FacebookPostWidget.svelte";
  import MastodonPostWidget from "./MastodonPostWidget.svelte";
  import BlueskyPostWidget from "./BlueskyPostWidget.svelte";
  import ThreadsPostWidget from "./ThreadsPostWidget.svelte";
  import account from "$lib/client/stores/account.store";
  import SocialPostContentFallback from "./SocialPostContentFallback.svelte";
  import context from "$lib/client/stores/context.store";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { properCase } from "$lib/shared/utils/text.utils";

  export let node: INode;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;

  const nodeContext = getContext<any>("node");
  let oembedHtml: string | null = null;
  let error: string = "";
  onMount(async () => {
    await resolveParent();
  });

  async function resolveParent() {
    if (nodeContext?.parent) parent = nodeContext.parent;
  }

  function shouldShowWidget() {
    if (!account.isCloudUserAndOnline()) return false;

    const supportedWidgets = [
      NodeType.TWEET,
      NodeType.INSTAGRAM_POST,
      NodeType.LINKEDIN_POST,
      NodeType.REDDIT_POST,
      NodeType.MASTODON_POST,
      NodeType.BLUESKY_POST,
      NodeType.THREADS_POST
    ];

    const supportedWidgetsOnEmbed = [
      NodeType.TWEET,
      NodeType.INSTAGRAM_POST,
      NodeType.MASTODON_POST,
      NodeType.BLUESKY_POST,
      NodeType.THREADS_POST
    ];

    if ($context.isEmbed) {
      return supportedWidgetsOnEmbed.includes(node.contentType);
    } else {
      return supportedWidgets.includes(node.contentType);
    }
  }

  function onError(event: CustomEvent) {
    error = event.detail;
  }
  function resolveOpenInButtonLabel() {
    let suffix = "";
    if (node.contentType === NodeType.TWEET) suffix = "Twitter";
    else suffix = properCase(node.contentType.split("_POST")[0]);
    return `Open on ${suffix}`;
  }
</script>

{#if oembedHtml}
  {@html oembedHtml}
{:else if shouldShowWidget() && node.url && !error}
  <button
    class="relative w-full h-full px-4 flex flex-col justify-center items-center overflow-y-auto"
    on:click={() => {
      if (node.url) appStore.openLink(node.url);
    }}
  >
    <div class="absolute inset-0 flex justify-center items-center z-0 mb-12">
      <Icon icon="svg-spinners:3-dots-fade" size={Size.lg} />
    </div>
    <div
      class="relative w-9/10 flex-grow flex flex-col items-center max-w-2xl py-6 z-10"
    >
      {#if $context.isEmbed}
        <button class="absolute inset-0 z-20" on:click></button>
      {/if}
      {#if node.contentType === NodeType.TWEET}
        <TweetPreviewUsingWidget tweetUrl={node.url} />
      {:else if node.contentType === NodeType.INSTAGRAM_POST}
        <InstagramPostWidget postUrl={node.url} />
      {:else if node.contentType === NodeType.LINKEDIN_POST}
        <LinkedInPostWidget postUrl={node.url} />
      {:else if node.contentType === NodeType.REDDIT_POST}
        <RedditPostWidget postUrl={node.url} />
      {:else if node.contentType === NodeType.FACEBOOK_POST}
        <FacebookPostWidget
          postUrl={node.url}
          on:error={onError}
          on:fallback={onError}
        />
      {:else if node.contentType === NodeType.MASTODON_POST}
        <MastodonPostWidget
          postUrl={node.url}
          on:error={onError}
          on:fallback={onError}
        />
      {:else if node.contentType === NodeType.BLUESKY_POST}
        <BlueskyPostWidget postUrl={node.url} on:error={onError} />
      {:else if node.contentType === NodeType.THREADS_POST}
        <ThreadsPostWidget
          postUrl={node.url}
          on:error={onError}
          on:fallback={onError}
        />
      {/if}
    </div>
    <div class="flex justify-center items-center w-full gap-4 pt-4 pb-8">
      <Button
        style={ButtonStyle.PLAIN}
        label="View permanent copy"
        isUnderlined={true}
        size={Size.sm}
        on:click={(e) => {
          e.stopPropagation();
          onError(new CustomEvent("fallback", { detail: "fallback" }));
        }}
      />
      <Button
        style={ButtonStyle.PLAIN}
        label={resolveOpenInButtonLabel()}
        isUnderlined={true}
        size={Size.sm}
        on:click
      />
    </div>
  </button>
{:else}
  <SocialPostContentFallback {node} />
{/if}
