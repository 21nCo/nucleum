<script lang="ts">
  import { IconVariant } from "$lib/tidy/types/icon.type";
  import Icon from "../Icon.svelte";
  import BackgroundElement from "../style/BackgroundElement.svelte";
  export let icon: string;
  export let on: boolean = false;
  function onclick() {
    on = !on;
  }
</script>

<BackgroundElement
  parentBgIndex={on ? 2 : 1}
  on:click={onclick}
  class="flex items-center justify-center h-10 px-3 py-2 rounded-md"
>
  <Icon {icon} variant={on ? IconVariant.Solid : IconVariant.Outline} />
</BackgroundElement>
