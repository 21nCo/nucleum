<script lang="ts">
  import Text from "@21n/elements/text/Text.svelte";
  import InlineFeedbackText from "@21n/extensions/clipper/InlineFeedbackText.svelte";
  import {
    AlertType,
    type IInlineStatus
  } from "@21n/types/notification.type";
  import { TextStyle } from "@21n/types/text.enum";
  import { activeSession } from "@21n/products/pointron/focus/session.store";
  import FocusNotes from "@21n/products/pointron/focus/notes/FocusNotes.svelte";
  import type { IMarkdown } from "@21n/components/markdown/md.type";

  let feedback: IInlineStatus | undefined = undefined;
  const mountTs = new Date().getTime();
  let notes: IMarkdown = { blocks: [] };

  $: {
    const sessionNotes = $activeSession.notes;
    if (sessionNotes && sessionNotes !== notes) {
      notes = sessionNotes;
    }
  }

  $: if ($activeSession.notes !== notes) {
    activeSession.update((session) => ({ ...session, notes }));
  }

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
  bind:md={notes}
  parentBgIndex={2}
  on:debouncedChange={onChange}
>
  <div class="flex gap-2 items-center" slot="title">
    <Text content="Notes" style={TextStyle.PANEL_HEADING} />
    <InlineFeedbackText {feedback} />
  </div>
</FocusNotes>
