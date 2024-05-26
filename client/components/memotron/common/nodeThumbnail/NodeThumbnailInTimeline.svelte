<script lang="ts">
  import { contentPreview } from "$lib/client/utils/node.utils";
  import BackgroundElement from "$lib/client/elements/style/BackgroundElement.svelte";
  import { userPreferences } from "$lib/client/stores/app.store";
  import { dataManager } from "$lib/client/stores/data.store";
  import {
    NodeType,
    type INodeThumbnail
  } from "$lib/client/types/memotron/node.type";
  import { Size } from "$lib/client/types/size.enum";
  import {
    isValidArrayWithData,
    objIsEmpty
  } from "$lib/client/utils/obj.utils";
  import { properCase } from "$lib/client/utils/text.utils";
  import { bgClass } from "$lib/client/utils/theme.utils";
  import { formatDate, formatTime } from "$lib/client/utils/time.utils";
  import Memocon from "../Memocon.svelte";
  import DLinks from "../foreLinks/DirectLinks.svelte";
  // export let id: string;
  export let node: INodeThumbnail | undefined;
  export let parentBackgrounIndex: number = 0;
  export let variant: "v1" | "v2" = "v2";
</script>

{#if node}
  {#if variant === "v1"}
    <BackgroundElement
      parentBgIndex={parentBackgrounIndex}
      class="flex flex-col gap-1 max-h-fit rounded-md w-full p-4"
      on:click
    >
      <div class="flex w-full justify-between">
        <span class="text-b3 text-fgs3">
          {formatTime($userPreferences, new Date(node.createdAt))}
        </span>
        <span class="bg-aps2 rounded-md px-2">
          {properCase(node.contentType)}
        </span>
      </div>
      <div class="w-full text-left truncate text-fgs2 font-medium text-h5">
        {node.label ?? ""}
      </div>
      {#if node.contentType === NodeType.AUDIO}
        <audio class="bg-transparent" controls src={node.body.url} />
      {/if}
      <div class="pt-4">
        <DLinks links={node.links} context="nodethumbnail" />
      </div>
    </BackgroundElement>
  {:else}
    <!-- TODO - bg on hover -->
    <BackgroundElement
      parentBgIndex={parentBackgrounIndex - 1}
      class="flex flex-col gap-2 rounded-md p-2"
    >
      <span class="text-left text-b3 text-fgs3">
        {formatTime($userPreferences, new Date(node.createdAt))}
      </span>
      <div class="flex">
        <BackgroundElement
          parentBgIndex={parentBackgrounIndex + 1}
          class="h-[110%] w-0.5 ml-4 mr-2"
        ></BackgroundElement>
        <button
          class="flex flex-col gap-1 max-h-fit rounded-md w-full p-2 cursor-pointer"
          on:click
        >
          <div class="flex w-full justify-between">
            <span
              class="flex items-center gap-1 w-full text-left text-fgs2 truncate font-medium text-h5"
            >
              <!-- {#if !objIsEmpty(node.avatar)}
                <Memocon
                  avatar={node.avatar}
                  size={Size.sm}
                />
              {/if} -->
              {node.label}
            </span>
          </div>
          {#if "body" in node && node.body}
            <span class="text-left text-b2">
              {contentPreview(node.body)}
            </span>
          {/if}
          {#if node.contentType === NodeType.AUDIO}
            <audio class="bg-transparent" controls src={node.body.url} />
          {/if}
          <!-- {#if isValidArrayWithData(node.links)}
            <div class="pt-4">
              <DLinks links={node.links} context="nodethumbnail" />
            </div>
          {/if} -->
          <div class="flex gap-2">
            {#if node.children && node.children.length > 0}
              <BackgroundElement
                parentBgIndex={parentBackgrounIndex + 1}
                class="rounded-md px-2 mt-4 text-b3"
              >
                {node.children.length}
                {node.contentType === NodeType.WEBPAGE ? " highlights" : ""}
              </BackgroundElement>
            {/if}
            <BackgroundElement
              parentBgIndex={parentBackgrounIndex + 1}
              class="rounded-md px-2 mt-4 text-b3"
            >
              {properCase(node.contentType)}
            </BackgroundElement>
          </div>
        </button>
      </div>
    </BackgroundElement>
  {/if}
{/if}
