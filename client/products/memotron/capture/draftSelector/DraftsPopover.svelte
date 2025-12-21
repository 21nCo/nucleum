<script lang="ts">
  import Text from "@21n/elements/text/Text.svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import { TextStyle } from "@21n/types/text.enum";
  import type { ICapture } from "@21n/products/memotron/capture/capture.type";
  import DraftItem from "@21n/products/memotron/capture/draftSelector/DraftItem.svelte";
  import { isSameResource } from "@21n/components/flux/resourceStores/resource.utils";
  import EdgeButton from "@21n/elements/button/EdgeButton.svelte";
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
  class="flex flex-col gap-2 w-full bg-bgs1 rounded-md dp:w-[32rem] dp:min-w-[32rem]"
>
  <div class="cw:px-2 py-4 px-4">
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
  </div>
  <div class="flex justify-center w-full mt-3">
    <EdgeButton
      icon="cross"
      tooltip="Close"
      label="Close"
      on:click={() => onClose()}
    />
  </div>
</div>
