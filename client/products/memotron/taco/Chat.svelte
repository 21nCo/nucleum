<script lang="ts">
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import Icon from "@21n/elements/Icon.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { SearchStore } from "@21n/components/record/record.store";
  import { tacoWorker } from "@21n/products/memotron/memotron.utils";
  import { SearchType } from "@21n/types/data.type";

  import { onMount, onDestroy } from "svelte";
  import { TacoActions } from "@21n/products/memotron/taco/taco.types";

  const QAsearchStore = new SearchStore();
  let isLoading: boolean = false;
  let type = "";
  let index = 0;
  let question: string = "";
  let answer: string = "";

  function resetLoadingState() {
    isLoading = false;
    index = 0;
  }
  async function onQuestion() {
    isLoading = true;
    typeWriter();
    answer = "";
    let node = await QAsearchStore.select({
      resource: Resource.node,
      searchQuery: question,
      searchType: SearchType.SEMANTIC,
      semanticSearchTopK: 1
    });
    if (node.length == 0) {
      answer = "No relevant information found";
      resetLoadingState();
      return;
    }
    //TODO- implement actual chat using text generator rather than using just QA
    // tacoWorker.postMessage({
    //   action: TacoActions.GENERATE_TEXT,
    //   params: {
    //     context: node[0].mdText,
    //     question: question
    //   }
    // });
    tacoWorker.postMessage({
      action: TacoActions.GET_ANSWER,
      params: {
        question: question,
        context: node[0].text
      }
    });
    answer = await new Promise((resolve, reject) => {
      tacoWorker.onmessage = (e: MessageEvent) => {
        resolve(e.data);
      };
    });
    resetLoadingState();
  }

  function typeWriter() {
    if (index < 3) {
      type += " .";
    } else {
      type = "";
      index = -1;
    }
    setTimeout(() => {
      index++;
      if (isLoading) typeWriter();
    }, 300);
  }

  onDestroy(() => {
    isLoading = false;
  });
  onMount(() => typeWriter());
</script>

<div class="w-[393px] h-[500px] bg-bgs2 flex flex-col justify-end gap-4 p-4">
  <div class="flex flex-col gap-4">
    {#if isLoading}
      <p>Thinking{type}</p>
    {:else}
      <p>{answer}</p>
    {/if}
    <div class="relative h-fit">
      <TextInput
        bind:value={question}
        placeholder="Ask question on any markdown"
        on:enter={onQuestion}
      />
      <span class="absolute right-2 top-[10px]">
        <Icon icon="proicons:send" on:click={onQuestion} /></span
      >
    </div>
  </div>
</div>
