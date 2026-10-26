<svelte:options runes={true} />

<script>
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
</script>

{$appStore?.appData?.name ?? ""}
{" v" + ($appStore?.version ?? "") + "." + ($appStore?.build ?? "")}
