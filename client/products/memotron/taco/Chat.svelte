<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { SearchStore } from "$lib/client/products/memotron/memotron.store";
  import { tacoWorker } from "$lib/client/products/memotron/memotron.utils";
  import { SearchType } from "$lib/client/types/data.type";
  import { TacoActions } from "$lib/client/types/taco.types";

  import { onMount, onDestroy } from "svelte";

  const QAsearchStore = new SearchStore();
  QAsearchStore.searchType = SearchType.SEMANTIC;
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
      semanticSearchTopK: 1
    });
    // answer = await QuestionAnswerer.getAnswer(question, node[0].mdText);
    //TODO- implement actual chat using text generator rather than using just QA
    // tacoWorker.postMessage({
    //   action: TacoActions.GENERATE_TEXT,
    //   params: {
    //     context: node[0].mdText,
    //     question: question
    //   }
    // });
    if (node.length == 0) {
      answer = "No relevant information found";
      resetLoadingState();
      return;
    }
    tacoWorker.postMessage({
      action: TacoActions.GET_ANSWER,
      params: {
        question: question,
        context: node[0].mdText
      }
    });
    answer = await new Promise((resolve, reject) => {
      tacoWorker.onmessage = (e) => {
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
