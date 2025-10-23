<script lang="ts">
  import { GlobalEvent, type Event } from "@21n/types/event.enum";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let event: Event[];
  /**
   * If set, the component will only listen to inline toast events with this specific ID
   */
  export let inlineToastId: string | undefined = undefined;

  function onInlineToast(e: CustomEvent) {
    const toast = e.detail;
    if (
      event.includes(GlobalEvent.INLINE_TOAST) &&
      (!inlineToastId || toast.id === inlineToastId)
    ) {
      dispatch("inlinetoast", toast);
    }
  }

  function onEvent(e: CustomEvent) {
    if (event.some((x) => x === e.detail.event)) {
      dispatch(e.detail.event, e.detail.value);
    }
  }
</script>

<svelte:window on:inlinetoast={onInlineToast} on:event={onEvent} />
