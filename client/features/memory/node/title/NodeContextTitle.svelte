<script lang="ts">
  import { tick, untrack } from "svelte";
  import type { IActiveNodeStore } from "@nucleum/features/memory/node/node.store";

  let {
    node
  }: {
    node: IActiveNodeStore;
  } = $props();

  let draft = $state("");
  let inputRef = $state<HTMLInputElement | undefined>(undefined);
  let isCancelled = false;
  const label = $derived($node.label || "Untitled");

  const isEditing = $derived($node.isInEditMode);

  $effect(() => {
    if (!isEditing) return;
    untrack(() => {
      draft = $node.label ?? "";
      isCancelled = false;
      void tick().then(() => {
        inputRef?.focus();
        inputRef?.select();
      });
    });
  });

  async function saveLabel() {
    if (isCancelled || !$node.isInEditMode) return;
    const next = draft.trim();
    if (next === ($node.label ?? "")) return;
    $node.label = next;
    await node.modify({ label: next });
  }

  async function finish() {
    await saveLabel();
    node.toggleEditMode(false);
  }

  function cancel() {
    isCancelled = true;
    node.toggleEditMode(false);
  }

  function onKeydown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      void finish();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  }
</script>

{#if $node.isInEditMode}
  <input
    bind:this={inputRef}
    bind:value={draft}
    class="min-w-48 w-72 h-8 px-2 rounded-md border border-brs3 bg-bgs1 text-base font-medium text-fgs1 outline-none focus:border-aps1"
    placeholder="Enter title"
    aria-label="Title"
    data-testid="node-context-title-input"
    onkeydown={onKeydown}
    onblur={() => void saveLabel()}
  />
{:else}
  <button
    type="button"
    class="min-w-0 max-w-[20rem] truncate px-1 rounded-md text-left hover:bg-bgs3"
    title="Rename"
    data-testid="node-context-title"
    onclick={() => node.toggleEditMode(true)}
  >
    {label}
  </button>
{/if}
