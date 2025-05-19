<script lang="ts">
  import Text from "$lib/client/elements/text/Text.svelte";
  import InlineFeedbackText from "$lib/client/extensions/clipper/InlineFeedbackText.svelte";
  import {
    AlertType,
    type IInlineStatus
  } from "$lib/client/types/notification.type";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { activeSession } from "../session.store";
  import FocusNotes from "./FocusNotes.svelte";

  let feedback: IInlineStatus | undefined = undefined;
  const mountTs = new Date().getTime();

  /**
   * Preventing the feedback on mount to avoid flickering
   * @param e
   */
  async function onChange(e: any) {
    const elapsed = new Date().getTime() - mountTs;
    if (elapsed < 2000) return;
    feedback = {
      type: AlertType.PROGRESS,
      message: "Saving..."
    };
    await activeSession.saveNotes();
    setTimeout(() => {
      feedback = {
        type: AlertType.SUCCESS,
        message: "Notes saved"
      };
    }, 1000);
  }
</script>

<FocusNotes
  bind:md={$activeSession.notes}
  parentBgIndex={2}
  on:debouncedChange={onChange}
>
  <div class="flex gap-2 items-center" slot="title">
    <Text content="Notes" style={TextStyle.PANEL_HEADING} />
    <InlineFeedbackText {feedback} />
  </div>
</FocusNotes>
