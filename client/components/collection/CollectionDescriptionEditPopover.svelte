<script lang="ts">
  import TextArea from "$lib/client/elements/input/TextArea.svelte";
  import InlineFeedbackText from "$lib/client/extensions/clipper/InlineFeedbackText.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { AlertType } from "$lib/client/types/notification.type";
  import type { IActiveCollectionStore } from "./collection.store";
  export let collection: IActiveCollectionStore;

  let status:
    | {
        type: AlertType;
        message: string;
      }
    | "" = "";

  async function onDescriptionChange(e: CustomEvent<any>) {
    status = {
      type: AlertType.PROGRESS,
      message: "Updating description..."
    };
    const result = await collection.modify({ description: e.detail });
    if (!result || result.error) {
      status = {
        type: AlertType.ERROR,
        message: "Failed to update description"
      };
      return;
    }
    status = {
      type: AlertType.SUCCESS,
      message: "Description updated"
    };
  }
</script>

<div class="flex flex-col gap-3 p-3 w-96 max-w-full">
  <TextArea
    placeholder="Add a description"
    style={InputStyle.FILLED}
    bind:value={$collection.description}
    rows={4}
    on:debouncedChange={onDescriptionChange}
  />
  <InlineFeedbackText bind:feedback={status} />
</div>
