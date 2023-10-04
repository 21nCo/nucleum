<script lang="ts">
  import { SvelteComponent, createEventDispatcher, onMount } from "svelte";

  export let label: string;
  export let id: string;
  export let classList: string = "";

  export let icon: string | undefined = "";
  export let customIconPath: string | undefined = "";

  export let activeClassList: string = "";
  export let inActiveClassList: string = ""; // this is done because, if we have some classes which are going to be changing depending on the active state, and if we put their initial value in classList, then we won't be able to override it later

  export let isActive: boolean = false;
  export let style: string = "";

  let iconComponent: typeof SvelteComponent | undefined;

  const dispatch = createEventDispatcher();

  function handleTagClick(e: any) {
    dispatch("click", { label, id });
  }

  onMount(async () => {
    // if icon is present then dynamically import it from the tidy icon folder or from the customIconPath
    try {
      if (icon) {
        const { default: Icon } = await import(
          `${
            customIconPath ? `../../${customIconPath}` : `../../tidy/icons`
          }/${icon}.svelte`
        );
        iconComponent = Icon;
      }
    } catch (err) {
      console.log(err);
    }
  });
</script>

<button
  {style}
  tabindex="0"
  on:click={handleTagClick}
  class={`w-fit flex items-center justify-center whitespace-nowrap ${classList} ${
    isActive ? `${activeClassList}` : `${inActiveClassList}`
  }`}
>
  {#if icon && iconComponent}
    <div class="min-w-[1rem] mr-1 flex justify-center items-center w-4 h-4">
      <svelte:component this={iconComponent} {isActive} />
    </div>
  {/if}
  {label}
</button>
