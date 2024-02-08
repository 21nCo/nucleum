<script>
  import { appStore } from "$lib/tidy/stores/app.store";
  import { isValidString } from "$lib/tidy/utils/text.utils";
</script>

{$appStore?.appData?.name ?? ""}
{" v" + (isValidString($appStore?.appData?.version) ?? "")}
