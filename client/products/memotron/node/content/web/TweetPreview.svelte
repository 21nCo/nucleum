<script lang="ts">
  import { appStore } from "@21n/stores/app.store";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import { formatDatetime } from "@21n/utils/time.utils";
  import { getContext, onMount } from "svelte";
  import { resolveContentPreview } from "@21n/products/memotron/node/node.utils";
  import type { ITweet } from "@21n/products/memotron/node/node.type";
  import InlineInfoBanner from "@21n/elements/text/InlineInfoBanner.svelte";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import { Persistence } from "@21n/persistence/persistence";
  import TweetPreviewUsingWidget from "@21n/products/memotron/node/content/web/social/TweetPreviewUsingWidget.svelte";
  import account from "@21n/stores/account.store";
  import { InfoTextType } from "@21n/types/text.type";
  import { parse } from "@21n/shared-utils/json.utils";
  export let node: ITweet;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  const nodeContext = getContext<any>("node");

  let parent: any;
  let parentUsername: string;
  let oembedHtml: string | null = null;
  const contentPreview = resolveContentPreview(node);

  onMount(async () => {
    parentUsername = node.parent?.toString().split("twitterProfile_")[1] ?? "";
    if (!parentUsername) {
      parentUsername = node.parent?.url?.split("x.com/")[1] ?? "";
    }
    await resolveParent();
  });

  async function resolveParent() {
    if (nodeContext?.parent) parent = nodeContext.parent;
  }

  /**
   * @deprecated - using TweetPreviewUsingWidget instead
   */
  async function resolveOembedHtml() {
    const oEmbedUrl = `https://publish.twitter.com/oembed?url=${node.url}`;
    const urlData = await new Persistence().retrieveUrlData(oEmbedUrl, {
      isReturnRawData: true
    });
    const parsed = parse(urlData.text);
    oembedHtml = parsed.html;
  }
</script>

{#if oembedHtml}
  {@html oembedHtml}
{:else if account.isCloudUserAndOnline()}
  <button
    class="w-full h-full px-4 flex justify-center items-center overflow-y-auto"
    on:click={() => {
      appStore.openLink(node.url);
    }}
  >
    <TweetPreviewUsingWidget tweetUrl={node.url} />
  </button>
{:else}
  <div
    class="w-full h-full mo:p-4 flex flex-col gap-6 justify-center items-center"
  >
    <button
      class="flex flex-col gap-5 p-4 hover:bg-bgs2 border border-fgs4 rounded-md mo:w-full w-3/4"
      on:click|stopPropagation={() => {
        appStore.openLink(node.url);
      }}
    >
      {#if parent}
        <div class="flex gap-2">
          <div>
            <img
              class="w-10 h-10 rounded-full"
              src={parent.body?.profileImageUrl}
              alt="Profile"
            />
          </div>
          <div class="flex flex-col items-start">
            <div class="text-b2">
              {parent.label ?? parent.body?.name}
            </div>
            <div class="text-b4 text-fgs3">
              @{parentUsername}
            </div>
          </div>
        </div>
      {/if}
      <div class="text-left overflow-y-auto max-h-80">
        {contentPreview}
      </div>
      <div class="text-b3 text-fgs3 text-right">
        Posted:
        {formatDatetime($userPreferences, node.body.postedAt)}
      </div>
    </button>
    {#if accessPoint === ResourceAccessPoint.SELF}
      <div class="mo:w-full w-3/4">
        <InlineInfoBanner
          content="Tweets that contain images are not supported during offline mode."
          type={InfoTextType.WARNING}
        />
      </div>
    {/if}
  </div>
{/if}
