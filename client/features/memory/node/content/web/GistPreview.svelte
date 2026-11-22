<script lang="ts">
  import type { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
  import { renderMdAsHtml } from "@21n/ui/elements/markdown/markdown.utils";
  import type { IGist } from "@nucleum/features/memory/node/node.type";
  import {
    EMBED_IFRAME_SANDBOX,
    resolveUpgradedEmbedFrameUrl
  } from "@nucleum/features/memory/node/content/web/social/embed-html";
  let {
    node,
    accessPoint
  }: {
    node: IGist;
    accessPoint: ResourceAccessPoint;
  } = $props();
  void accessPoint;

  let snippetContent = $state("");
  let snippetMetadata = $state<{ title?: string; description?: string } | null>(
    null
  );
  let loading = $state(true);
  let error = $state("");

  async function fetchGitLabSnippet(url: string) {
    try {
      loading = true;
      error = "";
      const snippetId = url.match(/snippets\/(\d+)/)?.[1];
      if (!snippetId) {
        throw new Error("Invalid GitLab snippet URL");
      }

      const [metadataResponse, contentResponse] = await Promise.all([
        fetch(`https://gitlab.com/api/v4/snippets/${snippetId}`),
        fetch(`https://gitlab.com/api/v4/snippets/${snippetId}/raw`)
      ]);

      if (!metadataResponse.ok || !contentResponse.ok) {
        throw new Error("Failed to fetch snippet");
      }

      snippetMetadata = await metadataResponse.json();
      snippetContent = await contentResponse.text();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : "Failed to load snippet";
      snippetMetadata = null;
      snippetContent = "";
    } finally {
      loading = false;
    }
  }

  function resolveHttpsUrl(url: string): URL | null {
    const frameUrl = resolveUpgradedEmbedFrameUrl(url);
    return frameUrl ? new URL(frameUrl) : null;
  }

  function isGitHubGist(url: string): boolean {
    return resolveHttpsUrl(url)?.hostname === "gist.github.com";
  }

  function isGitLabSnippet(url: string): boolean {
    const parsed = resolveHttpsUrl(url);
    return (
      parsed?.hostname === "gitlab.com" &&
      parsed.pathname.includes("/-/snippets/")
    );
  }

  function resolveGistFrameUrl(url: string): string {
    const parsed = resolveHttpsUrl(url);
    if (!parsed) return "about:blank";
    parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}.pibb`;
    parsed.search = "";
    parsed.hash = "";
    return parsed.href;
  }

  $effect(() => {
    if (node.url && isGitLabSnippet(node.url)) {
      fetchGitLabSnippet(node.url);
    }
  });
</script>

<div class="w-full h-full flex justify-center items-center">
  {#if node.url}
    {#if isGitHubGist(node.url)}
      <iframe
        title="GitHub Gist"
        src={resolveGistFrameUrl(node.url)}
        sandbox={EMBED_IFRAME_SANDBOX}
        class="w-full h-full border-0 min-h-[200px]"
        frameborder="0"
        scrolling="auto"
      />
    {:else if isGitLabSnippet(node.url)}
      {#if loading}
        <div class="text-fgs3">Loading snippet...</div>
      {:else if error}
        <div class="text-red-500">{error}</div>
      {:else}
        <div class="w-full h-full flex flex-col gap-4 p-4">
          {#if snippetMetadata?.title}
            <p class="text-h4 font-semibold">{snippetMetadata.title}</p>
          {/if}
          {#if snippetMetadata?.description}
            <p class="text-fgs2 text-left">
              {@html renderMdAsHtml(snippetMetadata.description)}
            </p>
          {/if}
          <pre class="w-full flex-1 overflow-auto bg-bgs2 rounded-md p-4"><code
              >{snippetContent}</code
            ></pre>
        </div>
      {/if}
    {:else}
      <div class="text-fgs3">
        Invalid snippet URL. Please provide a GitHub gist or GitLab snippet URL.
      </div>
    {/if}
  {:else}
    <div class="text-fgs3">No snippet URL provided</div>
  {/if}
</div>

<style>
  pre {
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
      "Courier New", monospace;
    font-size: 0.875rem;
    line-height: 1.25rem;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
</style>
