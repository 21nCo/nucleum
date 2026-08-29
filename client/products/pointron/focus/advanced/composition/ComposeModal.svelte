<script lang="ts">
  import { activeSession } from "@21n/products/pointron/focus/session.store";
  import ComposeDuration from "@21n/products/pointron/focus/advanced/composition/ComposeDuration.svelte";
  import type { SessionComposition } from "@21n/types/pointron/sessionComposition.type";
  import { deepCopy } from "@21n/shared-utils/obj.utils";
  async function onCompositionChanges(event: CustomEvent<SessionComposition>) {
    await activeSession.modify(
      { composition: deepCopy(event.detail) },
      { isPersist: false }
    );
    activeSession.onComposeComplete();
  }
</script>

<ComposeDuration
  composition={$activeSession.composition}
  isActiveSessionContext={true}
  compositionChangeHandler={onCompositionChanges}
/>
