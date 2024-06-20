<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import Icon from "../Icon.svelte";
  export let color: string = "";
  export let text: string | undefined = undefined;
</script>

<button class="flex items-center" on:click>
  <Icon icon="chevleft" size={Size.sm} class="stroke-ccs1" />
  <div class="pr-1 text-fgs1">{text ?? "Back"}</div>
</button>
