<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import type { IButtonParams } from "$lib/client/types/button.type";
  import BottomFloat from "../BottomFloat.svelte";
  export let params: IButtonParams;
  let classList: string = "";
  export { classList as class };
</script>

<BottomFloat class={classList}>
  <Button
    {...params}
    parentBgIndex={params.parentBgIndex}
    type={params.variant}
    style={params.style}
    on:click={async () => {
      if (params.callback) await params?.callback();
    }}
  />
</BottomFloat>
