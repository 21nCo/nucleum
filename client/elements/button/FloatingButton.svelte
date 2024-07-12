<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import type { IButtonParams } from "$lib/client/types/button.type";
  import BottomFloat from "../BottomFloat.svelte";
  export let params: IButtonParams;
</script>

<BottomFloat>
  <span class="w-[12rem]">
    <Button
      {...params}
      parentBgIndex={params.parentBgIndex}
      type={params.variant}
      style={params.style}
      isExpandToFullWidth={true}
      on:click={async () => {
        if (params.callback) await params?.callback();
      }}
    />
  </span>
</BottomFloat>
