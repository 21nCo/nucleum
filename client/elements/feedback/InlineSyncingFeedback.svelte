<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import Icon from "../Icon.svelte";
  export let isSyncing: boolean = false;
</script>

<span class="flex items-center gap-2 text-fgs3" class:hidden={!isSyncing}>
  <span>
    <Icon icon="svg-spinners:eclipse" size={Size.xs} />
  </span>
  <span class="text-b3"> Syncing... </span>
</span>
