<script lang="ts">
  import { SvelteComponent, createEventDispatcher, onMount } from "svelte";
  import Icon from "./Icon.svelte";
  import { IconVariant } from "../types/icon.type";
  import { SelectionItemActiveStyle } from "../types/switcher.enum";
  import ActiveBackgroundElement from "./style/ActiveBackgroundElement.svelte";

  export let label: string;
  export let id: string;
  export let icon: string | undefined = "";
  let classList = `text-b3 border-[1px] rounded-[4px] py-1 px-3 transition-all active:scale-105 border-fgs2`;
  let activeClassList = "bg-aps1 border-a1 text-bgs1 focus:bg-aps1";
  let inActiveClassList = "bg-transparent border-fgs2 text-fgs1";
  let disabledClassList = "bg-bgs2 border-fgs2 text-fgs1 active:scale-100";

  export let isActive: boolean = false;
  export let style: string = "";
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher();

  function handleTagClick(e: any) {
    if (disabled) return;
    dispatch("click", { label, id });
  }
</script>

<ActiveBackgroundElement
  isBackgroundActive={isActive}
  styles={style}
  on:click={handleTagClick}
  isIncludeActiveBorder={true}
  classList="w-fit flex items-center justify-center gap-1 whitespace-nowrap {classList} {disabled &&
    `${disabledClassList} cursor-not-allowed`}"
>
  {#if icon}
    <div class="min-w-[1rem] mr-2 flex justify-center items-center w-4 h-4">
      <Icon
        selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
        {isActive}
        {icon}
        variant={IconVariant.Outline}
      />
    </div>
  {/if}
  {label}
</ActiveBackgroundElement>
