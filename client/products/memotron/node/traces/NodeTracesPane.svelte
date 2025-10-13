<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { hexToRGBA } from "$lib/client/products/memotron/pdfAnnotator/pdfAnnotator.utils";
  import { Size } from "$lib/client/types/size.enum";
  import type { IActiveNodeStore } from "../node.store";
  import { getContext } from "svelte";
  import {
    canHaveTraces,
    NodeType,
    socialProfileNodeTypeList
  } from "../node.type";
  import { highlightStore } from "../../common/highlighters/highlight.store";
  import { AnnotationType } from "../../pdfAnnotator/pdfAnnotator.type";
  import Resources from "../../../../components/record/Records.svelte";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { convertDateStringToArray } from "$lib/client/utils/utils";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import NodeTasksPane from "./NodeTasksPane.svelte";
  import { resolveNodeIcon } from "../node.utils";
  import { preferences } from "$lib/client/stores/preferences/preferences.store";
  import { Preference } from "$lib/client/stores/preferences/preferences.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { derived } from "svelte/store";
  const contentContext = getContext<any>("content");

  export let node: IActiveNodeStore | null = null;
  $: pdfAnnotations = $node?.pdfAnnotations ?? [];
  let options = resolveOptions($node?.contentType);
  let selectedType: string | undefined = undefined;

  const hideHighlightColors = derived(
    [preferences, appStore],
    ([$preferences, $appStore]) => {
      const key = `${$appStore.product}-${Preference.HIDE_HIGHLIGHT_COLORS}`;
      return ($preferences[key] as boolean) ?? false;
    }
  );

  function resolveOptions(contentType: NodeType | undefined) {
    const tasks = {
      value: "tasks",
      label: "Tasks",
      icon: "check-square"
    };
    const comments = {
      value: "comments",
      label: "Comments",
      icon: "chat-two"
    };

    if (
      contentType === NodeType.PDF ||
      contentType === NodeType.WEB_PAGE ||
      contentType === NodeType.KINDLE_BOOK
    ) {
      return [
        {
          value: "clips",
          label: "Bookmarks",
          icon: "bookmark"
        }
        // tasks
      ];
    } else if (socialProfileNodeTypeList.has(contentType)) {
      return [
        {
          value: "clips",
          label: "Posts",
          icon: resolveNodeIcon(contentType)
        }
        // tasks
      ];
    } else if (
      contentType === NodeType.YOUTUBE_VIDEO ||
      contentType === NodeType.YOUTUBE_SHORT
    ) {
      return [
        {
          value: "clips",
          label: "Bookmarks",
          icon: "youtube"
        }
        // tasks
      ];
    } else if (contentType === NodeType.NODULAR_MARKDOWN) {
      return [tasks, comments];
    }
  }
</script>

{#if options && options.length > 1}
  <OptionSelector {options} size={Size.sm} bind:selected={selectedType} />
{/if}

{#if pdfAnnotations.length > 0}
  {@const hasItems =
    (selectedType === "tasks" &&
      pdfAnnotations.some(
        (trace) => trace.annotType === AnnotationType.TASK
      )) ||
    (selectedType !== "tasks" &&
      pdfAnnotations.some((trace) => trace.annotType !== AnnotationType.TASK))}
  <div class="w-full flex flex-col flex-grow gap-2 mt-2 overflow-y-scroll">
    {#each pdfAnnotations as trace, index}
      {#if (selectedType == "tasks" && trace.annotType === AnnotationType.TASK) || (selectedType != "tasks" && trace.annotType !== AnnotationType.TASK)}
        <button
          class="block relative w-full p-2 text-b2 text-left border border-brs3 rounded-md hover:bg-bgs2"
          on:click={() => {
            contentContext.publish("pdf-trace-click", {
              id: trace.id,
              pageNumber: trace.pageNumber
            });
          }}
        >
          <div class="flex justify-between">
            {#if trace.date}
              {@const [day, month, year] = convertDateStringToArray(trace.date)}
              <p class="text-b2 font-semibold">
                <span>{day}</span>
                <span>{month}</span>
                <span class="font-medium">{year}</span>
              </p>
            {/if}
            {#if trace.startPageNumber}
              <p class="text-b3 text-fgs3">
                Page {trace.startPageNumber}
              </p>
            {/if}
          </div>
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
            {@const color = $hideHighlightColors
              ? undefined
              : highlightStore.resolveColor(trace.color)}
            <div
              class="w-full min-h-fit p-2 rounded-md text-fgs2"
              style="text-decoration: 2px {trace.annotType?.toLowerCase()} {!$hideHighlightColors &&
              trace.annotType !== AnnotationType.HIGHLIGHT
                ? color
                : ''}; "
            >
              <span
                style={!$hideHighlightColors &&
                trace.annotType === AnnotationType.HIGHLIGHT
                  ? `background-color: ${hexToRGBA(color, 0.2)};`
                  : ""}
              >
                {trace.selectedText.slice(0, 100)}</span
              >
            </div>
          {/if}
          {#if trace.due}
            <p class="font-medium trace.due.date">
              <span class="font-normal">Due:</span>
              {trace.due.date}
            </p>
            <!-- <CheckboxInput
              checked={trace.due.completed}
              label={trace.due.date}
              class="font-medium "
            /> -->
          {/if}
        </button>
      {/if}
    {/each}
    {#if !hasItems}
      <EmptyStatusView
        mainText={selectedType === "tasks"
          ? "No tasks found"
          : "No traces found"}
        subText={selectedType === "tasks"
          ? "This page doesn't have any tasks yet"
          : "This page doesn't have any traces yet"}
      />
    {/if}
  </div>
{:else if canHaveTraces.includes($node?.contentType ?? NodeType.UNKNOWN) && (selectedType === "clips" || !selectedType)}
  {#if $node?.clips && $node?.clips?.length > 0}
    <div class="h-full w-full overflow-y-auto">
      <Resources
        data={$node.clips}
        accessPoint={ResourceAccessPoint.NODE_TRACES}
        resource={Resource.node}
        size={Size.sm}
        isPreventDefault={$node.contentType === NodeType.YOUTUBE_VIDEO ||
          $node.contentType === NodeType.YOUTUBE_SHORT}
        on:click={(e) => {
          if (!e?.detail) return;
          if (
            $node.contentType !== NodeType.YOUTUBE_VIDEO &&
            $node.contentType !== NodeType.YOUTUBE_SHORT
          )
            return;
          contentContext.publish("yt-trace-click", {
            id: e.detail.id,
            timestamp: e.detail.body.timestamp
          });
        }}
      />
      <ScrollViewBottomSpacer size={Size.lg} />
    </div>
  {:else}
    <EmptyStatusView
      mainText="No bookmarks found"
      subText="This page doesn't have any bookmarks yet"
    />
  {/if}
{:else if selectedType === "tasks"}
  <NodeTasksPane {node} />
{:else if selectedType === "comments"}
  <ComingSoonView
    mainText="Coming soon"
    subText="Commenting will be available soon"
  />
{:else}
  <EmptyStatusView size={Size.sm} mainText="No bookmarks found" />
{/if}
