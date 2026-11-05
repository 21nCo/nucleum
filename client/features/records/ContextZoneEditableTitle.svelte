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
  import { resolveTitleSaveQueue } from "@nucleum/features/records/title-save-queue";

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

  const queue = resolveTitleSaveQueue(untrack(() => store.id.toString()));
  const isEditing = $derived($store.isInEditMode);

  $effect(() => {
    queue.endSession();
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

  const noSave: Promise<unknown> = Promise.resolve();
  let pendingLabel: string | undefined;

  /**
   * Submits the draft when it is a new title: not cancelled, edited, and
   * different from the latest submitted or stored title.
   */
  function submitDraft() {
    if (isCancelled || !isDirty || !$store.isInEditMode) return;
    const next = draft.trim();
    if (next === resolveLatestLabel()) return;
    const { save, sequence } = submitLabel(next);
    pendingSave = save;
    pendingLabel = next;
    save
      .then(() => {
        if (queue.isLatest(sequence) && draft.trim() === next) isDirty = false;
      }, reportSaveFailure)
      .finally(() => {
        if (pendingSave === save) pendingSave = undefined;
      });
  }

  /**
   * The save this editor has to see succeed before it closes, with its title:
   * its own latest save, or else the queued save of the latest submitted
   * title, which an editor it replaced may have started.
   */
  function resolveExitSave() {
    if (pendingSave) return { save: pendingSave, label: pendingLabel };
    const inherited = queue.resolveLatestSave();
    return inherited
      ? { save: inherited, label: resolveLatestLabel() }
      : { save: noSave, label: undefined };
  }

  /** Submits a new title and returns the save the editor waits for. */
  function saveLabel() {
    submitDraft();
    return resolveExitSave().save;
  }

  function submitLabel(next: string) {
    return queue.submit(next, (label) => store.modify({ label }));
  }

  function resolveLatestLabel() {
    return queue.resolveLatestLabel(get(store).label ?? "");
  }

  /**
   * Leaves edit mode through one path for a clean, an unchanged or a changed
   * draft: it submits a new title, then waits for the save that decides the
   * title, the editor's own or one it inherited, and closes only once that
   * save succeeds while the editing session is still current. A newer save
   * started meanwhile is awaited too. When the save fails, the editor stays
   * open with the failed title as an edited draft, so confirming again
   * retries it. A finish outlived by its session, cancelled, closed, reopened
   * or replaced, stops without saving or closing the new one.
   */
  async function finish() {
    const session = queue.session;
    for (;;) {
      submitDraft();
      const { save, label } = resolveExitSave();
      try {
        await save;
      } catch {
        if (session === queue.session) keepFailedTitle(label);
        return false;
      }
      if (session !== queue.session) return false;
      submitDraft();
      if (resolveExitSave().save === save) break;
    }
    store.toggleEditMode(false);
    return true;
  }

  function keepFailedTitle(label: string | undefined) {
    if (!isDirty && label !== undefined) draft = label;
    isDirty = true;
    inputRef?.focus();
  }

  onMount(() => {
    const unregister = registerEditModeFinisher(store.id.toString(), finish);
    return () => {
      queue.endSession();
      unregister();
    };
  });

  function reportSaveFailure(error: unknown) {
    logger.error({ at: "ContextZoneEditableTitle.save", error });
    toasts.error("Could not save the title");
  }

  function saveOnRemoval(_input: HTMLInputElement) {
    return {
      destroy() {
        if (isCancelled || !isDirty) return;
        const next = draft.trim();
        if (next === resolveLatestLabel()) return;
        submitLabel(next).save.catch(reportSaveFailure);
      }
    };
  }

  function cancel() {
    isCancelled = true;
    queue.endSession();
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
