<script lang="ts">
  import { observeAttributes } from "@21n/actions/observe.action";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { onMount } from "svelte";
  let {
    resource,
    isSyncing = $bindable(false)
  }: {
    resource: Resource;
    isSyncing?: boolean;
  } = $props();
  let ref = $state<HTMLElement>();

  onMount(() => {
    refreshFromGlobal();
  });

  export function refresh(resourceParam?: Resource) {
    const syncstatusVal = ref?.getAttribute("data-syncstatus");
    setStatus(syncstatusVal ?? null, resourceParam);
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
    if (!value || value?.includes("finished")) {
      isSyncing = false;
    } else if (
      value?.includes(resourceParam ?? resource) ||
      value?.includes(Resource.everything) ||
      resource === Resource.everything ||
      resource === Resource.unknown
    ) {
      isSyncing = true;
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
  class="absolute"
>
</span>
