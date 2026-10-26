<script lang="ts">
  import HoldActionPicker from "@21n/ui/compositions/actions/HoldActionPicker.svelte";
  import {
    hapticFeedback,
    postMessageToParent
  } from "@nucleum/client/runtime/embed/embed.utils";
  import { HapticFeedback } from "@nucleum/client/runtime/embed/haptic.enum";
  import { EmbedMessage } from "@nucleum/client/runtime/embed/embedMessage.enum";

  function triggerAction(icon: string) {
    if (icon.includes("camera")) postMessageToParent(EmbedMessage.CAMERA);
  }
</script>

<HoldActionPicker
  onAction={triggerAction}
  onHold={() => hapticFeedback(HapticFeedback.PRESSANDHOLD)}
/>
