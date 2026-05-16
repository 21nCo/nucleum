<svelte:options runes={true} />

<script>
  import { appStore } from "@21n/stores/app.store";
</script>

{$appStore?.appData?.name ?? ""}
{" v" + ($appStore?.version ?? "") + "." + ($appStore?.build ?? "")}
