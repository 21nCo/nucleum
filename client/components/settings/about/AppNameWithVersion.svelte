<script>
  import { appStore } from "$lib/client/stores/app.store";
  import { isValidString } from "$lib/shared/utils/text.utils";
</script>

{$appStore?.appData?.name ?? ""}
{" v" + (isValidString($appStore?.appData?.version) ?? "")}
