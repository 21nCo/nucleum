<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { ButtonStyle, type ButtonParams } from "$lib/tidy/types/button.type";
  import BottomFloat from "../BottomFloat.svelte";
  export let params: ButtonParams;
</script>

<BottomFloat>
  <Button
    {...params}
    type={params.variant}
    width="w-[13rem]"
    on:click={params.callback}
    style={ButtonStyle.ROUNDED}
  />
</BottomFloat>
