<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";
  import Icon from "../Icon.svelte";
  export let color: string = "";
  export let text: string | undefined = undefined;
</script>

<button class="flex items-center" on:click>
  <Icon icon="chevleft" size={Size.sm} {color} />
  <div class="pr-1">{text ?? "Back"}</div>
</button>
