<script lang="ts">
  import { appStore } from "@21n/stores/app.store";
  import { NodeType, socialSubNodeTypeList } from "@21n/products/memotron/node/node.type";
  import type { INode } from "@21n/products/memotron/node/node.type";

  export let node: INode;

  let platformDisplay: string = "";

  $: {
    if (socialSubNodeTypeList.has(node.contentType)) {
      setPlatformInfo(node.contentType);
    }
  }

  function setPlatformInfo(contentType: NodeType) {
    const platformMap: Record<NodeType, string> = {
      [NodeType.LINKEDIN_GROUP]: "LinkedIn Group",
      [NodeType.FACEBOOK_GROUP]: "Facebook Group",
      [NodeType.REDDIT_SUB]: "Subreddit"
    };

    platformDisplay = platformMap[contentType] || "Social";
  }

  function resolveUsername() {
    if (!node.url) {
      return node.body?.username || "unknown";
    }

    try {
      const url = new URL(node.url);
      const hostname = url.hostname.toLowerCase();
      const pathname = url.pathname;

      const cleanPath = pathname.split("?")[0].split("#")[0];

      if (hostname.includes("reddit.com")) {
        const match = cleanPath.match(/^\/r\/([^/]+)/);
        return match ? match[1] : "unknown";
      }

      const pathSegments = cleanPath
        .split("/")
        .filter((segment) => segment.length > 0);
      if (pathSegments.length > 0) {
        const username = pathSegments[pathSegments[0] === "profile" ? 1 : 0];
        if (username && username.startsWith("@")) {
          return username.substring(1);
        }
        return username || "unknown";
      }
    } catch (error) {
      console.warn("Failed to parse profile URL:", node.url, error);
    }

    return node.body?.username || "unknown";
  }

  function getDisplayName() {
    return (
      node.label ||
      node.body?.name ||
      node.body?.displayName ||
      node.metadata?.displayName ||
      resolveUsername()
    );
  }

  function getBio() {
    return node.body?.bio || "";
  }
</script>

<div class="flex justify-center items-center h-full w-full">
  <button
    class="flex flex-col items-center gap-6 p-8 border border-fgs4 rounded-md hover:bg-bgs2 max-w-md"
    on:click={() => {
      appStore.openLink(node.url);
    }}
  >
    <div class="flex flex-col gap-1 text-center">
      <div class="text-lg font-semibold">{getDisplayName()}</div>
      <div class="text-b3 text-fgs3">@{resolveUsername()}</div>
      <div class="text-b4 text-fgs2">{platformDisplay}</div>
    </div>

    {#if getBio()}
      <div class="text-center text-b3 max-w-xs">{getBio()}</div>
    {/if}
  </button>
</div>
