<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/tidy/types/button.type";
  import BottomFloat from "../BottomFloat.svelte";
  export let label: string;
  export let action: () => void;
  export let icon: string | undefined = undefined;
  export let type: string = "primary";
</script>

<BottomFloat>
  <Button
    {label}
    {type}
    width="w-[13rem]"
    {icon}
    on:click={action}
    style={ButtonStyle.ROUNDED}
  />
</BottomFloat>
