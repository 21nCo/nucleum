<script lang="ts">
  import CollapsibleList from "./collapsible/CollapsibleList.svelte";
  import Title from "./Title.svelte";
  import type { IFaq } from "./landing.type";
  export let faqs: IFaq[] = [];
</script>

<div class="flex flex-col gap-10">
  <Title title="Frequently asked questions" />
  <CollapsibleList items={faqs} />
</div>
