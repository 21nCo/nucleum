<script>
  import { appStore } from "$lib/client/stores/app.store";
</script>

{$appStore?.appData?.name ?? ""}
{" v" + ($appStore?.version ?? "") + "." + ($appStore?.build ?? "")}
