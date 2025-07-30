<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { TextStyle } from "$lib/client/types/text.enum";
  import type { ICapture } from "../capture.type";
  import DraftItem from "./DraftItem.svelte";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  export let drafts: ICapture[] = [];
  export let onClose: () => void;
  export let onSelect: (draft: ICapture) => void;
  export let onDelete: (id: IRecordId) => void;

  async function deleteDraft(e: CustomEvent) {
    if (!e.detail.id) return;
    onDelete(e.detail.id);
    drafts = drafts.filter((draft) => !isSameResource(draft, e.detail.id));
  }
</script>

<div
  class="flex flex-col gap-2 w-full bg-bgs1 rounded-md p-4 dp:w-[32rem] dp:min-w-[32rem] border border-brs2"
>
  <div class="px-2">
    <Text content="Drafts" style={TextStyle.SECTION_HEADING} />
  </div>
  <div class="flex flex-col gap-1 max-h-[20rem] overflow-y-auto">
    {#each drafts as draft (draft.id.toString())}
      <DraftItem
        {draft}
        on:click={() => onSelect(draft)}
        on:delete={deleteDraft}
      />
    {/each}
  </div>
  <div class="flex justify-center w-full mt-3">
    <button
      class="flex items-center rounded-full bg-bgs2 notouch:hover:bg-bgs3 active:bg-bgs3 p-3"
      on:click={() => onClose()}
    >
      <Icon icon="cross" />
    </button>
  </div>
</div>
