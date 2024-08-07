<script lang="ts">
  import { contentPreview } from "$lib/client/products/memotron/node/node.utils";
  import { userPreferences } from "$lib/client/stores/app.store";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import {
    NodeType,
    type INodeThumbnail
  } from "$lib/client/products/memotron/node/node.type";
  import { Size } from "$lib/client/types/size.enum";
  import {
    isValidArrayWithData,
    objIsEmpty
  } from "$lib/shared/utils/obj.utils";
  import { properCase } from "$lib/shared/utils/text.utils";
  import { formatDate, formatTime } from "$lib/client/utils/time.utils";
  import DLinks from "../../common/foreLinks/DirectLinks.svelte";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  // export let id: string;
  export let node: INodeThumbnail | undefined;
  export let parentBgIndex: number = 0;
  export let variant: "v1" | "v2" = "v2";
</script>

{#if node}
  {#if variant === "v1"}
    <button
      class={cn(
        "flex flex-col gap-1 max-h-fit rounded-md w-full p-4",
        bg(parentBgIndex)
      )}
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
    </button>
  {:else}
    <!-- TODO - bg on hover -->
    <div
      class={cn("flex flex-col gap-2 rounded-md p-2", bg(parentBgIndex - 1))}
    >
      <span class="text-left text-b3 text-fgs3">
        {formatTime($userPreferences, new Date(node.createdAt))}
      </span>
      <div class="flex">
        <div
          class={cn("h-[110%] w-0.5 ml-4 mr-2", bg(parentBgIndex + 1))}
        ></div>
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
              <div
                class={cn(
                  "rounded-md px-2 mt-4 text-b3",
                  bg(parentBgIndex + 1)
                )}
              >
                {node.children.length}
                {node.contentType === NodeType.WEB_PAGE ? " highlights" : ""}
              </div>
            {/if}
            <div
              class={cn("rounded-md px-2 mt-4 text-b3", bg(parentBgIndex + 1))}
            >
              {properCase(node.contentType)}
            </div>
          </div>
        </button>
      </div>
    </div>
  {/if}
{/if}
