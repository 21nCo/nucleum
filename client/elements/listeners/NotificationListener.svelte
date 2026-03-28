<script lang="ts">
  import { GlobalEvent, type Event as AppEvent } from "@21n/types/event.enum";
  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();

  export let event: AppEvent[];
  /**
   * If set, the component will only listen to inline toast events with this specific ID
   */
  export let inlineToastId: string | undefined = undefined;

  function onInlineToast(e: CustomEvent<{ id?: string }>) {
    const toast = e.detail;
    if (
      event.includes(GlobalEvent.INLINE_TOAST) &&
      (!inlineToastId || toast.id === inlineToastId)
    ) {
      dispatch("inlinetoast", toast);
    }
  }

  function onEvent(e: CustomEvent<{ event: AppEvent; value?: unknown }>) {
    if (event.some((x) => x === e.detail.event)) {
      dispatch(e.detail.event, e.detail.value);
    }
  }

  onMount(() => {
    const inlineToastHandler: EventListener = (windowEvent) => {
      onInlineToast(windowEvent as CustomEvent<{ id?: string }>);
    };
    const eventHandler: EventListener = (windowEvent) => {
      onEvent(windowEvent as CustomEvent<{ event: AppEvent; value?: unknown }>);
    };
    window.addEventListener("inlinetoast", inlineToastHandler);
    window.addEventListener("event", eventHandler);
    return () => {
      window.removeEventListener("inlinetoast", inlineToastHandler);
      window.removeEventListener("event", eventHandler);
    };
  });
</script>
