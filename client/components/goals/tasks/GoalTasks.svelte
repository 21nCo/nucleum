<script lang="ts">
  import type { IRecordId } from "$lib/client/types/data.type";
  import { onMount } from "svelte";
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import { SearchStore } from "../../record/record.store";
  import type { ITodo } from "../../todos/todo.type";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { todoStore } from "../../todos/todo.store";
  import { isValidArray } from "$lib/shared/utils/obj.utils";
  import Todo from "../../todos/Todo.svelte";

  export let id: IRecordId;
  let todos: ITodo[] = [];
  let searchStore = new SearchStore(Resource.task);
  let newTodo: string = "";

  onMount(() => {
    refresh();
  });

  async function refresh() {
    const result = await searchStore.select({
      filters: {
        taskId: id.toString()
      }
    });
    if (isValidArray(result)) {
      todos = result;
    } else {
      todos = [];
    }
  }

  async function save() {
    console.log({ newTodo });
    const result = await todoStore.save({
      label: newTodo,
      taskId: id,
      isChecked: false
    });
    console.log({ result });
  }
</script>

<div class="flex flex-col gap-2">
  {#each todos as todo}
    <Todo {todo} />
  {/each}
  <TextInput
    bind:value={newTodo}
    placeholder="Add a task"
    icon="ph:plus-light"
    isShowSaveControl={newTodo !== ""}
    on:enter={save}
    on:save={save}
  />
</div>
