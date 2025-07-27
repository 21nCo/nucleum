<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { onMount } from "svelte";
  import { flux } from "../flux/flux";
  import { Size } from "$lib/client/types/size.enum";
  import { parse, stringify } from "$lib/shared/utils/json.utils";

  let query = "";
  let result: any;
  let viewer: any;
  let recentQueries: any[] = [];

  onMount(() => {
    recentQueries = parse(localStorage.getItem("recentQueries") || "[]");
  });

  async function executeQuery() {
    result = await flux.selectByQuery(query);
    console.table(result);
    console.log(result);
    renderResult();
    recentQueries = [query, ...recentQueries];
    saveRecents();
  }

  function saveRecents() {
    localStorage.setItem("recentQueries", stringify(recentQueries));
  }

  function renderResult() {}
</script>

<!-- TODO - json viewer -->
<div class="w-full h-full flex flex-col gap-4 p-2">
  <textarea
    bind:value={query}
    class="w-full min-h-40 bg-bgs2 border border-brs3 rounded-md p-2 focus:outline focus:outline-aps1"
    placeholder="Query"
  ></textarea>

  <div class="flex justify-center gap-2">
    <Button
      label="Execute"
      on:click={executeQuery}
      type={ButtonVariant.PRIMARY}
    />
    <Button label="Clear" on:click={() => (query = "")} />
  </div>
  <div class="overflow-auto w-full">
    <div id="json-viewer"></div>
  </div>
  <div class="overflow-auto w-full flex flex-col gap-2">
    <div class="text-h4 font-medium text-left">Recent queries</div>
    {#each recentQueries as queryItem, index (index)}
      <div
        class="flex justify-between items-center gap-2 text-b2 border border-brs3 rounded-md p-2"
      >
        <span>
          {queryItem}
        </span>
        <span class="flex gap-2">
          <Button
            label="Copy"
            size={Size.sm}
            isPreventMinWidth={true}
            on:click={() => {
              navigator.clipboard.writeText(queryItem);
            }}
          />
          <Button
            label="Execute"
            size={Size.sm}
            isPreventMinWidth={true}
            on:click={() => {
              query = queryItem;
              executeQuery();
            }}
          />
        </span>
      </div>
    {/each}
  </div>
</div>

<ComponentBaseLayer hasDragAndDrop={true} />
