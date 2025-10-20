<script lang="ts">
  import CollapsibleList from "@21n/landing/shared/collapsible/CollapsibleList.svelte";
  import Title from "@21n/landing/shared/Title.svelte";
  import type { IFaq } from "@21n/landing/shared/landing.type";
  export let faqs: IFaq[] = [];
</script>

<div class="flex flex-col gap-10">
  <Title title="Frequently asked questions" />
  <CollapsibleList items={faqs} />
</div>
