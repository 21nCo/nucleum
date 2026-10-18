<script>
  import { navigation } from "@nucleum/shell/navigation/navigation";

  import { page } from "$app/stores";
  import PageError from "@nucleum/surfaces/help/errors/PageError.svelte";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import { ButtonVariant } from "@21n/ui/elements/button/button.type";

  function resolveErrorParam() {
    return $page?.url?.searchParams?.get("error") ?? undefined;
  }

  function resolveActions() {
    if (!resolveErrorParam()?.includes("beta")) {
      return [];
    }
    return [
      {
        label: "Request Early Access",
        variant: ButtonVariant.PRIMARY,
        callback: async () => {
          navigation.openLink(
            $appStore?.appData?.urls?.earlyAccess ?? "https://21n.org"
          );
        }
      }
    ];
  }
</script>

<PageError message={resolveErrorParam()} actions={resolveActions()} />
