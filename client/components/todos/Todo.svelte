<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ITodo } from "./todo.type";
  import { createEventDispatcher } from "svelte";
  export let todo: ITodo;
  const dispatch = createEventDispatcher();

  function onToggle() {
    dispatch("toggle", todo.id);
  }
</script>

<div class="flex gap-2 items-center px-4 py-2 border rounded-md border-brs2">
  <input
    class="w-4 h-4"
    type="checkbox"
    bind:checked={todo.isChecked}
    on:change={onToggle}
  />
  <span class={cn({ "line-through": todo.isChecked })}>{todo.label}</span>
</div>
