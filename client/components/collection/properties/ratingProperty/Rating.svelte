<script lang="ts">
  import { InputStyle, type InputLabel } from "$lib/client/types/input.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import InputBaseElement from "$lib/client/elements/InputBaseElement.svelte";
  import { createEventDispatcher } from "svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  const dispatch = createEventDispatcher();
  export let avatar: string = "star";
  export let count: number;
  export let value: number;
  export let style: InputStyle = InputStyle.BORDERED;
  export let label: InputLabel | undefined = undefined;
  export let isReadOnlyMode: boolean = false;
  export let parentBgIndex: number = 1;
  if (typeof avatar !== "string") {
    avatar = "star";
  }
</script>

{#if isReadOnlyMode}
  {#if count <= 6}
    <div class={cn("flex gap-1")}>
      {#each Array(count) as _, item}
        {@const _icon = +item + 1 <= value ? avatar + "-fill" : avatar}
        <Icon icon={`ph:${_icon}`} />
      {/each}
    </div>
  {:else}
    <span class="flex items-center gap-1">
      <Icon icon={`ph:${avatar}-fill`} />
      <span>{value} / {count}</span>
    </span>
  {/if}
{:else}
  <InputBaseElement {style} {label} {parentBgIndex}>
    {#if typeof count === "number" && count <= 6}
      <div class={cn("flex gap-2")}>
        {#each Array(count) as _, item}
          {@const _icon = +item + 1 <= value ? avatar + "-fill" : avatar}
          <button
            on:click={() => {
              value = +item + 1;
              dispatch("change", value);
            }}
            class="flex items-center h-full"
          >
            <Icon icon={`ph:${_icon}`} />
          </button>
        {/each}
      </div>
    {:else}
      <div class="flex items-center justify-between gap-1 w-full">
        <div class="flex items-center gap-1">
          <Icon icon={`ph:${avatar}-fill`} />
          <TextInput
            {value}
            type="number"
            on:change={(e) => {
              if (e.detail) value = e.detail;
            }}
            on:debouncedChange={() => {
              dispatch("change", value);
            }}
            style={InputStyle.PLAIN}
            numberInputParams={{ min: 1, max: count, step: 1 }}
          />
        </div>
        <span>/{count}</span>
      </div>
    {/if}
  </InputBaseElement>
{/if}
