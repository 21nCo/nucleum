<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { SearchStore } from "$lib/client/products/memotron/memotron.store";
  import { SearchType } from "$lib/client/types/data.type";
  import { Size } from "$lib/client/types/size.enum";
  import { QuestionAnswerer } from "$lib/client/utils/Ai.utils";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import { onMount, onDestroy } from "svelte";

  const QAsearchStore = new SearchStore();
  QAsearchStore.searchType = SearchType.SEMANTIC;
  let isLoading: boolean = false;
  let type = "";
  let index = 0;
  let timerId: any;
  let question: string = "";
  let answer: string = "";
  async function onQuestion() {
    isLoading = true;
    typeWriter();
    answer = "";
    let node = await QAsearchStore.select({
      resource: Resource.node,
      searchQuery: question,
      semanticSearchTopK: 1
    });
    console.log("QA store result", node[0].mdText);
    answer = await QuestionAnswerer.getAnswer(question, node[0].mdText);
    isLoading = false;
    index = 0;
    // answer = await Text2textGenerator.generateText(question);
  }

  function typeWriter() {
    console.log(index, isLoading);
    if (index < 3) {
      type += " .";
    } else {
      type = "";
      index = 0;
    }
    setTimeout(() => {
      index++;
      if (isLoading) typeWriter();
    }, 300);
  }

  onDestroy(() => {
    isLoading = false;
  });
  //   onMount(() => typeWriter());
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
