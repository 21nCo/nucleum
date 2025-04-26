<script lang="ts">
  import TextArea from "$lib/client/elements/input/TextArea.svelte";
  import InlineFeedbackText from "$lib/client/extensions/clipper/InlineFeedbackText.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import { AlertType } from "$lib/client/types/notification.type";
  import type { IActiveCollectionStore } from "./collection.store";
  export let collection: IActiveCollectionStore;

  let status:
    | {
        type: AlertType;
        message: string;
      }
    | undefined = undefined;

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

<div
  class="flex flex-col gap-3 p-3 w-96 max-w-full bg-bgs1 border border-brs2 rounded-md"
>
  <TextArea
    placeholder="Add a description"
    width="w-full"
    label={{
      label: "Edit collection description",
      orientation: Orientation.Vertical
    }}
    style={InputStyle.FILLED}
    bind:value={$collection.description}
    rows={4}
    on:debouncedChange={onDescriptionChange}
  />
  <InlineFeedbackText bind:feedback={status} isRenderEmptyHeight={true} />
</div>
