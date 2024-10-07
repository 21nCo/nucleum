<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import type { ITwitterProfile } from "../../node.type";

  export let node: ITwitterProfile;

  function resolveUsername() {
    return node.url.split("x.com/")[1];
  }
</script>

<div class="flex justify-center items-center h-full w-full">
  <button
    class="flex flex-col items-center gap-6 p-8 border border-fgs4 rounded-md hover:bg-bgs2"
    on:click={() => {
      appStore.openLink(node.url);
    }}
  >
    <div>
      <img
        src={node.body.profileImageUrl}
        alt="Profile"
        class="w-20 h-20 rounded-full"
      />
    </div>
    <div class="flex flex-col gap-1">
      <div>{node.body.name}</div>
      <div class="text-b3 text-fgs3">@{resolveUsername()}</div>
    </div>
    {#if node.body.bio}
      <div>{node.body.bio}</div>
    {/if}
  </button>
</div>
