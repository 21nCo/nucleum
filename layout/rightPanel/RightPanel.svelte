<script lang="ts">
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { windowObject } from "$lib/tidy/stores/app.store";

  let isInThinMode = false;
</script>

{#if !$windowObject.isInPortraitMode}
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
      Right panel content
    </div>
  </div>
{/if}
