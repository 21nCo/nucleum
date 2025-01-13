<script lang="ts">
  import { observeAttributes } from "$lib/client/actions/observe.action";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { onMount } from "svelte";
  export let resource: Resource;
  export let isSyncing: boolean = false;
  let ref: HTMLElement;

  onMount(() => {
    refreshFromGlobal();
  });

  export function refresh(resourceParam?: Resource) {
    const syncstatusVal = ref?.getAttribute("data-syncstatus");
    setStatus(syncstatusVal, resourceParam);
  }

  function refreshFromGlobal() {
    const syncstatusVal = document
      .getElementById("global-sync-status")
      ?.getAttribute("data-syncstatus");
    if (syncstatusVal) setStatus(syncstatusVal);
  }

  function handleAttributeChange(
    attributeName: string,
    value: string | null,
    oldValue: string | null
  ) {
    if (attributeName !== "syncstatus") return;
    setStatus(value);
  }

  function setStatus(value: string | null, resourceParam?: Resource) {
    if (
      (value?.includes(resourceParam ?? resource) ||
        value?.includes(Resource.everything)) &&
      !value?.includes("finished")
    ) {
      isSyncing = true;
    } else if (value?.includes("finished")) {
      isSyncing = false;
    }
  }
</script>

<span
  bind:this={ref}
  use:observeAttributes={{
    attributes: ["syncstatus"],
    callback: handleAttributeChange
  }}
  data-syncfeedback="true"
  data-syncstatus=""
>
</span>
