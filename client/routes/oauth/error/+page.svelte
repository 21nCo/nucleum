<script>
  import { page } from "$app/stores";
  import PageError from "@21n/components/error/PageError.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { ButtonVariant } from "@21n/types/button.type";
  $: errorParam = $page?.url?.searchParams?.get("error");
  $: isBetaAccessError = errorParam && errorParam.includes("beta");
  $: actions = isBetaAccessError
    ? [
        {
          label: "Request Early Access",
          variant: ButtonVariant.PRIMARY,
          callback: async () => {
            appStore.openLink(
              $appStore?.appData?.urls?.earlyAccess ?? "https://21n.org"
            );
          }
        }
      ]
    : [];
</script>

<PageError message={errorParam ?? undefined} {actions} />
