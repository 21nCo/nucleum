<script lang="ts">
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { appStore, userPreferences } from "$lib/client/stores/app.store";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  import { type IActiveNodeStore } from "../../node.store";
  import { resolveContentPreview } from "../../node.utils";
  export let node: IActiveNodeStore;
  let parent: any;
  let parentUsername: string;
  const contentPreview = resolveContentPreview(
    $node.body,
    $node.contentType,
    $node.metadata
  );
  onMount(async () => {
    parentUsername = $node.parent?.split("twitterProfile_")[1] ?? "";
    await resolveParent();
    console.log({ parent });
  });
  async function resolveParent() {
    const dexie = $dataManager.cacheSource.dexie;
    if ($node.parent) parent = await dexie.node.get($node.parent);
  }
</script>

<div class="w-full h-full flex justify-center items-center">
  <button
    class="flex flex-col gap-5 p-4 hover:bg-bgs2 border border-fgs3 rounded-md w-3/4"
    on:click={() => {
      appStore.openLink($node.body.url);
    }}
  >
    {#if parent}
      <div class="flex gap-2">
        <div>
          <img
            class="w-10 h-10 rounded-full"
            src={parent.body?.profileImageUrl}
            alt="Profile picture"
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
      {formatDatetime($userPreferences, $node.body.postedAt)}
    </div>
  </button>
</div>
