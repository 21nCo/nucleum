<script lang="ts">
  import HoldActionPicker from "@21n/ui/compositions/actions/HoldActionPicker.svelte";
  import {
    hapticFeedback,
    postMessageToParent
  } from "@nucleum/client/runtime/embed/embed.utils";
  import { HapticFeedback } from "@nucleum/client/runtime/embed/haptic.enum";
  import { EmbedMessage } from "@nucleum/client/runtime/embed/embedMessage.enum";

  const actionMessages: Partial<Record<string, EmbedMessage>> = {
    camera: EmbedMessage.CAMERA
  };

  function triggerAction(icon: string) {
    const message = actionMessages[icon];
    if (message) postMessageToParent(message);
  }
</script>

<HoldActionPicker
  onAction={triggerAction}
  onHold={() => hapticFeedback(HapticFeedback.PRESSANDHOLD)}
/>
