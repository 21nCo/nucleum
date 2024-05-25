<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import view from "$lib/client/stores/view.store";

  let isInThinMode = true;
</script>

{#if !$view.isPortrait}
  <div
    class="flex justify-center items-center h-full {isInThinMode
      ? 'w-16'
      : 'w-72'}  mr-2 flex-none"
  >
    <div
      class="flex flex-col pt-8 gap-4 items-center justify-between overflow-auto w-full rounded-lg bg-bgs2"
      style="height: calc(100% - 1rem);"
    >
      <div class="w-full flex justify-center px-2">
        <Icon
          icon={isInThinMode ? "chevdoubleleft" : "chevdoubleright"}
          color="fgs2"
          on:click={() => {
            isInThinMode = !isInThinMode;
          }}
        />
      </div>
      {#if !isInThinMode}
        Right panel content
      {/if}
    </div>
  </div>
{/if}
