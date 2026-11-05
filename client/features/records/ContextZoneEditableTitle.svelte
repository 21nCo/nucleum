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
  let saves: Promise<unknown> = Promise.resolve();
  let queuedSaves = 0;
  let saveSequence = 0;
  let submittedLabel: string | undefined;
  let editSession = 0;

  const isEditing = $derived($store.isInEditMode);

  $effect(() => {
    editSession += 1;
    if (!isEditing) return;
    untrack(() => {
      draft = $store.label ?? "";
      isCancelled = false;
      isDirty = false;
      submittedLabel = undefined;
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
    if (next === resolveLatestLabel()) return pendingSave ?? Promise.resolve();
    const save = submitLabel(next);
    const sequence = saveSequence;
    pendingSave = save;
    save
      .then(() => {
        if (sequence === saveSequence && draft.trim() === next) isDirty = false;
      }, reportSaveFailure)
      .finally(() => {
        if (pendingSave === save) pendingSave = undefined;
      });
    return save;
  }

  /**
   * Title the saves leave behind: the last submitted one while saves are
   * queued, since the store shows an earlier one until they finish, and the
   * stored title otherwise.
   */
  function resolveLatestLabel() {
    return queuedSaves > 0 ? submittedLabel : (get(store).label ?? "");
  }

  /**
   * Queues a save of `next` after the earlier ones. When it is the latest save
   * and fails, the title no longer counts as submitted, so it is saved again.
   */
  function submitLabel(next: string) {
    const sequence = ++saveSequence;
    submittedLabel = next;
    queuedSaves += 1;
    const save = saves.then(() => store.modify({ label: next }));
    save.catch(() => {
      if (sequence === saveSequence) submittedLabel = undefined;
    });
    saves = save
      .catch(() => undefined)
      .finally(() => {
        queuedSaves -= 1;
      });
    return save;
  }

  /**
   * Saves the draft and leaves edit mode once the latest title is saved. While
   * a save is awaited the input stays editable, so after each one the draft is
   * checked again and a newer save is awaited before editing closes. A finish
   * outlived by its editing session, which was cancelled, closed or reopened
   * while a save was awaited, stops without saving or closing the new one.
   */
  async function finish() {
    const session = editSession;
    try {
      let save = saveLabel();
      for (;;) {
        await save;
        if (session !== editSession) return false;
        const next = saveLabel();
        if (next === save || next !== pendingSave) break;
        save = next;
      }
    } catch {
      if (session === editSession) inputRef?.focus();
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
        if (next === submittedLabel || next === resolveLatestLabel()) return;
        submitLabel(next).catch(reportSaveFailure);
      }
    };
  }

  function cancel() {
    isCancelled = true;
    editSession += 1;
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
