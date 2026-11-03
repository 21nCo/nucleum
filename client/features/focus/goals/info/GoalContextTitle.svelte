<script lang="ts">
  import { tick, untrack } from "svelte";
  import type { IActiveObjectiveStore } from "@nucleum/features/focus/goals/goal.store";

  let {
    objective
  }: {
    objective: IActiveObjectiveStore;
  } = $props();

  let draft = $state("");
  let inputRef = $state<HTMLInputElement | undefined>(undefined);
  let isCancelled = false;
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
      void tick().then(() => {
        inputRef?.focus();
        inputRef?.select();
      });
    });
  });

  async function saveLabel() {
    if (isCancelled || !$objective.isInEditMode) return;
    const next = draft.trim();
    if (next === ($objective.label ?? "")) return;
    $objective.label = next;
    await objective.modify({ label: next });
  }

  async function finish() {
    await saveLabel();
    objective.toggleEditMode(false);
  }

  function cancel() {
    isCancelled = true;
    objective.toggleEditMode(false);
  }

  function onKeydown(event: KeyboardEvent) {
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
    onkeydown={onKeydown}
    onblur={() => void saveLabel()}
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
