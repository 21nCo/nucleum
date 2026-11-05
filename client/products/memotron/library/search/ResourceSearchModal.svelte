<script lang="ts">
  import { navigation } from "@nucleum/shell/navigation/navigation";

  import { onMount } from "svelte";
  import ResourceSearchBase from "@nucleum/products/memotron/library/search/ResourceSearchBase.svelte";

  import { Action } from "@nucleum/client/config/action.enum";
  import SearchInput from "@nucleum/surfaces/search/SearchInput.svelte";

  let { isInline = false }: { isInline?: boolean } = $props();
  let searchInputRef: SearchInput;
  let searchBaseRef: ResourceSearchBase;

  onMount(async () => {
    setTimeout(() => {
      searchInputRef?.focus();
    }, 100);
  });
</script>

<ResourceSearchBase
  bind:this={searchBaseRef}
  isGlobalSearchModal={true}
  {isInline}
  onClose={() => {
    navigation.closeResource({
      id: Action.SEARCH
    });
  }}
>
  <div class="pl-4 w-full">
    <SearchInput bind:this={searchInputRef} />
  </div>
</ResourceSearchBase>
