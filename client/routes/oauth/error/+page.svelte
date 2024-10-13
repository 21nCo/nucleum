<script>
  import { page } from "$app/stores";
  import PageError from "$lib/client/components/error/PageError.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
  $: errorParam = $page?.url?.searchParams?.get("error");
  $: isBetaAccessError = errorParam && errorParam.includes("beta");
  $: actions = isBetaAccessError
    ? [
        {
          label: "Request Early Access",
          variant: ButtonVariant.PRIMARY,
          callback: async () => {
            appStore.openLink(
              $appStore?.appData?.urls?.earlyAccess ?? "https://21n.io"
            );
          }
        }
      ]
    : [];
</script>

<PageError message={errorParam ?? undefined} {actions} />
