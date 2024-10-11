<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { hexToRGBA } from "$lib/client/products/memotron/pdfAnnotator/pdfAnnotator.utils";
  import { Size } from "$lib/client/types/size.enum";
  import type { IActiveNodeStore } from "../node.store";
  import { getContext } from "svelte";
  import { canHaveTraces, NodeType } from "../node.type";
  import { highlightStore } from "../../common/highlighters/highlight.store";
  import { AnnotationType } from "../../pdfAnnotator/pdfAnnotator.type";
  import Resources from "../../common/Resources.svelte";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  const contentContext = getContext<any>("content");

  export let node: IActiveNodeStore | null = null;
  $: pdfAnnotations = $node?.pdfAnnotations ?? [];
  let options = resolveOptions($node?.contentType);
  let selectedType: string | undefined = undefined;

  function resolveOptions(contentType: NodeType | undefined) {
    if (contentType === NodeType.PDF) {
      return [
        {
          value: "clips",
          label: "Highlights",
          icon: "bookmark"
        },
        {
          value: "tasks",
          icon: "rocket"
        }
      ];
    } else if (contentType === NodeType.WEB_PAGE) {
      return [
        {
          value: "clips",
          label: "Clips",
          icon: "bookmark"
        },
        {
          value: "tasks",
          icon: "check-circle"
        }
      ];
    } else if (contentType === NodeType.TWITTER_PROFILE) {
      return [
        {
          value: "clips",
          label: "Tweets",
          icon: "ph:x-logo"
        },
        {
          value: "tasks",
          icon: "check-circle"
        }
      ];
    } else if (contentType === NodeType.YOUTUBE_VIDEO) {
      return [
        {
          value: "clips",
          label: "Clips",
          icon: "ph:youtube-logo"
        },
        {
          value: "tasks",
          icon: "check-circle"
        }
      ];
    } else if (contentType === NodeType.KINDLE_BOOK) {
      return [
        {
          value: "clips",
          label: "Highlights",
          icon: "bookmark"
        },
        {
          value: "tasks",
          icon: "rocket"
        }
      ];
    } else if (contentType === NodeType.NODULAR_MARKDOWN) {
      return [
        {
          value: "clips",
          label: "Comments",
          icon: "ph:chat-teardrop-text"
        },
        {
          value: "tasks",
          icon: "check-circle"
        },
        {
          label: "Outgoing mentions",
          value: "outgoing-mentions",
          icon: "at-symbol"
        }
      ];
    }
  }
</script>

{#if options}
  <OptionSelector {options} size={Size.sm} bind:selected={selectedType} />
{/if}

{#if pdfAnnotations.length > 0}
  <div class="h-full w-full flex flex-col gap-2 mt-2 overflow-y-scroll">
    {#each pdfAnnotations as trace, index}
      <button
        class="block relative w-full p-2 text-b2 text-left border border-brs3 rounded-md hover:bg-bgs2"
        on:click={() => {
          contentContext.publish("pdf-trace-click", {
            id: trace.id,
            pageNumber: trace.pageNumber
          });
        }}
      >
        <!-- TODO - delete, link, edit actions within traces panel -->
        <!-- <button
          on:click|stopPropagation={() => handleAnnotDelete(null, trace.id)}
          class="absolute top-1 right-0 material-symbols-rounded text-base text-fgs4 hover:text-h4 hover:text-fgs2 z-40"
          >{@html "&#Xe92b"}</button
        > -->
        {#if trace.comment}
          <div
            class="flex flex-col gap-2 w-full min-h-fit p-2 rounded-md text-fgs2"
          >
            {#if trace.selectedText}
              <blockquote
                class="border-l-2 border-orange-400 p-2 opacity-50 text-b3"
              >
                {trace.selectedText.slice(0, 100)}
              </blockquote>
            {/if}
            <div>
              {trace.comment}
            </div>
          </div>
        {:else}
          {@const color = highlightStore.resolveColor(trace.color)}
          <div
            class="w-full min-h-fit p-2 rounded-md text-fgs2"
            style="text-decoration: 2px {trace.annotType?.toLowerCase()} {trace.annotType !==
            AnnotationType.HIGHLIGHT
              ? color
              : ''}; "
          >
            <span
              style={trace.annotType === AnnotationType.HIGHLIGHT
                ? `background-color: ${hexToRGBA(color, 0.2)};`
                : ""}
            >
              {trace.selectedText.slice(0, 100)}</span
            >
          </div>
        {/if}
      </button>
    {/each}
  </div>
{:else if canHaveTraces.includes($node?.contentType ?? NodeType.UNKNOWN) && selectedType === "clips"}
  {#if $node?.clips && $node?.clips?.length > 0}
    <Resources
      data={$node.clips}
      accessPoint={ResourceAccessPoint.NODE_TRACES}
      resource={Resource.node}
      size={Size.sm}
      isPreventDefault={$node.contentType === NodeType.YOUTUBE_VIDEO}
      on:click={(e) => {
        if (!e?.detail) return;
        contentContext.publish("yt-trace-click", {
          id: e.detail.id,
          timestamp: e.detail.body.timestamp
        });
      }}
    />
  {:else}
    <EmptyStatusView
      mainText="No clips found"
      subText="This page doesn't have any clips yet"
    />
  {/if}
{:else}
  <ComingSoonView size={Size.sm} />
{/if}
