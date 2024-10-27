<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import { getContext, onMount } from "svelte";
  import { resolveContentPreview } from "../../node.utils";
  import type { ITweet } from "../../node.type";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  export let node: ITweet;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  const nodeContext = getContext<any>("node");

  let parent: any;
  let parentUsername: string;
  const contentPreview = resolveContentPreview(node);
  onMount(async () => {
    parentUsername = node.parent.toString().split("twitterProfile_")[1] ?? "";
    if (!parentUsername) {
      parentUsername = node.parent?.url?.split("x.com/")[1] ?? "";
    }
    await resolveParent();
    // console.log({ parent });
  });
  async function resolveParent() {
    if (nodeContext?.parent) parent = nodeContext.parent;
  }
</script>

<div class="w-full h-full flex flex-col gap-6 justify-center items-center">
  <button
    class="flex flex-col gap-5 p-4 hover:bg-bgs2 border border-fgs4 rounded-md w-3/4"
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
            {parent.body?.name}
          </div>
          <div class="text-b4 text-fgs3">
            @{parentUsername}
          </div>
        </div>
      </div>
    {/if}
    <div class="text-left">
      {contentPreview}
    </div>
    <div class="text-b3 text-fgs3 text-right">
      Posted:
      {formatDatetime($userPreferences, node.body.postedAt)}
    </div>
  </button>
  {#if accessPoint === ResourceAccessPoint.SELF}
    <div class="w-3/4">
      <InlineInfoBanner
        content="Note: Tweets that contain images are not supported yet."
      />
    </div>
  {/if}
</div>
