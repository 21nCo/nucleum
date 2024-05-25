<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import {
    ButtonStyle,
    type ButtonParams
  } from "$lib/client/types/button.type";
  import BottomFloat from "../BottomFloat.svelte";
  export let params: ButtonParams;
</script>

<BottomFloat>
  <Button
    {...params}
    type={params.variant}
    width="w-[13rem]"
    on:click={async () => {
      if (params.callback) await params?.callback();
    }}
    style={ButtonStyle.ROUNDED}
  />
</BottomFloat>
