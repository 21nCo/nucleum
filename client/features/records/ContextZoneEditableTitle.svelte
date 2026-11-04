<script lang="ts" module>
  import type { Readable } from "svelte/store";
  import type { IRecordId } from "@nucleum/schema/legacy/data.type";

  /**
   * Active resource store a context zone title renames: its label and edit
   * mode, with the mutations that save the label and leave edit mode.
   */
  export type EditableTitleStore = Readable<{
    label?: string;
    isInEditMode?: boolean;
  }> & {
    id: IRecordId;
    modify(value: { label: string }): Promise<unknown>;
    toggleEditMode(value: boolean): unknown;
  };
</script>

<script lang="ts">
  import { onMount, tick, untrack } from "svelte";
  import { get } from "svelte/store";
  import { cn } from "@21n/ui/environment/presentation";
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import { toasts } from "@nucleum/shared-state/notifications/notification.store";
  import { registerEditModeFinisher } from "@nucleum/shared-state/resources/edit-mode-finish";

  let {
    store,
    label,
    placeholder,
    inputLabel,
    renameLabel,
    testId,
    class: className = undefined
  }: {
    store: EditableTitleStore;
    /** Title shown while not editing. */
    label: string;
    placeholder: string;
    /** Accessible name of the title input. */
    inputLabel: string;
    /** Tooltip of the title button that starts renaming. */
    renameLabel: string;
    /** Test id of the title button; the input appends `-input`. */
    testId: string;
    /** Extra classes of the title button. */
    class?: string;
  } = $props();

  let draft = $state("");
  let inputRef = $state<HTMLInputElement | undefined>(undefined);
  let isCancelled = false;
  let isDirty = false;
  let pendingSave: Promise<unknown> | undefined;

  const isEditing = $derived($store.isInEditMode);

  $effect(() => {
    if (!isEditing) return;
    untrack(() => {
      draft = $store.label ?? "";
      isCancelled = false;
      isDirty = false;
      void tick().then(() => {
        inputRef?.focus();
        inputRef?.select();
      });
    });
  });

  function saveLabel() {
    if (isCancelled || !isDirty || !$store.isInEditMode)
      return pendingSave ?? Promise.resolve();
    const next = draft.trim();
    if (next === ($store.label ?? "")) return pendingSave ?? Promise.resolve();
    const save = store.modify({ label: next });
    pendingSave = save;
    save
      .then(() => {
        if (draft.trim() === next) isDirty = false;
      }, reportSaveFailure)
      .finally(() => {
        if (pendingSave === save) pendingSave = undefined;
      });
    return save;
  }

  async function finish() {
    try {
      await saveLabel();
    } catch {
      inputRef?.focus();
      return false;
    }
    store.toggleEditMode(false);
    return true;
  }

  onMount(() => registerEditModeFinisher(store.id.toString(), finish));

  function reportSaveFailure(error: unknown) {
    logger.error({ at: "ContextZoneEditableTitle.save", error });
    toasts.error("Could not save the title");
  }

  function saveOnRemoval(_input: HTMLInputElement) {
    return {
      destroy() {
        if (isCancelled || !isDirty) return;
        const next = draft.trim();
        if (next === (get(store).label ?? "")) return;
        store.modify({ label: next }).catch(reportSaveFailure);
      }
    };
  }

  function cancel() {
    isCancelled = true;
    store.toggleEditMode(false);
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      void finish();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    }
  }
</script>

{#if $store.isInEditMode}
  <input
    bind:this={inputRef}
    bind:value={draft}
    class="min-w-48 w-72 h-8 px-2 rounded-md border border-brs3 bg-bgs1 text-base font-medium text-fgs1 outline-none focus:border-aps1"
    {placeholder}
    aria-label={inputLabel}
    data-testid={`${testId}-input`}
    use:saveOnRemoval
    oninput={() => (isDirty = true)}
    onkeydown={onKeydown}
    onblur={() => saveLabel().catch(() => undefined)}
  />
{:else}
  <button
    type="button"
    class={cn(
      "min-w-0 truncate px-1 rounded-md text-left hover:bg-bgs3",
      className
    )}
    title={renameLabel}
    data-testid={testId}
    onclick={() => store.toggleEditMode(true)}
  >
    {label}
  </button>
{/if}
