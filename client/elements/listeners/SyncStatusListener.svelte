<script lang="ts">
  import { observeAttributes } from "@21n/actions/observe.action";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { nucleumDatafnStatus } from "@21n/stores/datafn.store";
  let {
    resource,
    isSyncing = $bindable(false)
  }: {
    resource: Resource;
    isSyncing?: boolean;
  } = $props();
  let ref = $state<HTMLElement>();

  $effect(() => {
    isSyncing =
      $nucleumDatafnStatus.status === "starting" ||
      $nucleumDatafnStatus.status === "syncing";
  });

  export function refresh(resourceParam?: Resource) {
    const syncstatusVal = ref?.getAttribute("data-syncstatus");
    setStatus(syncstatusVal ?? null, resourceParam);
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
