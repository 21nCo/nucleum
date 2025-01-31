<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import Icon from "../Icon.svelte";
  export let color: string = "";
  export let text: string | undefined = undefined;
</script>

<button
  class="flex items-center active:bg-bgs2 notouch:hover:bg-bgs2 rounded-r-md rounded-l-full"
  on:click
>
  <Icon icon="chevleft" size={Size.sm} />
  <div class="pr-1 text-fgs1">{text ?? "Back"}</div>
</button>
