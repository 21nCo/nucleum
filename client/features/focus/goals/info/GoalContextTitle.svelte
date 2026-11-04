<script lang="ts">
  import { onMount, tick, untrack } from "svelte";
  import { get } from "svelte/store";
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import { toasts } from "@nucleum/shared-state/notifications/notification.store";
  import { registerEditModeFinisher } from "@nucleum/shared-state/resources/edit-mode-finish";
  import type { IActiveObjectiveStore } from "@nucleum/features/focus/goals/goal.store";

  let {
    objective
  }: {
    objective: IActiveObjectiveStore;
  } = $props();

  let draft = $state("");
  let inputRef = $state<HTMLInputElement | undefined>(undefined);
  let isCancelled = false;
  let isDirty = false;
  let pendingSave: Promise<void> | undefined;
  const label = $derived($objective.label || "Untitled");

  async function startEditing() {
    draft = $objective.label ?? "";
    objective.toggleEditMode(true);
  }

  const isEditing = $derived($objective.isInEditMode);

  $effect(() => {
    if (!isEditing) return;
    untrack(() => {
      draft = $objective.label ?? "";
      isCancelled = false;
      isDirty = false;
      void tick().then(() => {
        inputRef?.focus();
        inputRef?.select();
      });
    });
  });

  function saveLabel() {
    if (isCancelled || !isDirty || !$objective.isInEditMode)
      return pendingSave ?? Promise.resolve();
    const next = draft.trim();
    if (next === ($objective.label ?? ""))
      return pendingSave ?? Promise.resolve();
    const save = objective.modify({ label: next });
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
    objective.toggleEditMode(false);
    return true;
  }

  onMount(() => registerEditModeFinisher(objective.id.toString(), finish));

  function reportSaveFailure(error: unknown) {
    logger.error({ at: "GoalContextTitle.save", error });
    toasts.error("Could not save the title");
  }

  function saveOnRemoval(_input: HTMLInputElement) {
    return {
      destroy() {
        if (isCancelled || !isDirty) return;
        const next = draft.trim();
        if (next === (get(objective).label ?? "")) return;
        objective.modify({ label: next }).catch(reportSaveFailure);
      }
    };
  }

  function cancel() {
    isCancelled = true;
    objective.toggleEditMode(false);
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

{#if $objective.isInEditMode}
  <input
    bind:this={inputRef}
    bind:value={draft}
    class="min-w-48 w-72 h-8 px-2 rounded-md border border-brs3 bg-bgs1 text-base font-medium text-fgs1 outline-none focus:border-aps1"
    placeholder="Enter objective name"
    aria-label="Objective name"
    data-testid="objective-context-title-input"
    use:saveOnRemoval
    oninput={() => (isDirty = true)}
    onkeydown={onKeydown}
    onblur={() => saveLabel().catch(() => undefined)}
  />
{:else}
  <button
    type="button"
    class="min-w-0 truncate px-1 rounded-md text-left hover:bg-bgs3"
    title="Rename objective"
    data-testid="objective-context-title"
    onclick={startEditing}
  >
    {label}
  </button>
{/if}
