<script lang="ts">
  import Breadcrumbs from "@21n/ui/compositions/navigation/breadcrumbs/Breadcrumbs.svelte";
  import type { IBreadcrumbItem } from "@21n/ui/compositions/navigation/breadcrumbs/breadcrumbItem.type";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import type { IAppBreadcrumbItem } from "@nucleum/shell/navigation/components/app-breadcrumb.type";

  let {
    items = [],
    isPreventDefault = false,
    limit = 3,
    onClick = undefined
  }: {
    items?: IAppBreadcrumbItem[];
    isPreventDefault?: boolean;
    limit?: number;
    onClick?: (
      event: CustomEvent<{
        event: MouseEvent | KeyboardEvent;
        item: IAppBreadcrumbItem;
      }>
    ) => void;
  } = $props();

  const presentationItems: IBreadcrumbItem[] = $derived(
    items.map((item) => ({
      id: item.id ?? item.resourceId ?? item.path,
      label: item.label,
      disabled: item.disabled
    }))
  );

  function handleItemClick(payload: {
    event: MouseEvent | KeyboardEvent;
    item: IBreadcrumbItem;
  }) {
    const item = items[presentationItems.indexOf(payload.item)];
    if (!item) return;
    if (isPreventDefault) {
      onClick?.(
        new CustomEvent("click", {
          detail: { event: payload.event, item }
        })
      );
      return;
    }
    if (item.path) {
      navigation.gotoPath(item.path);
      return;
    }
    if (!item.resourceId) return;
    const lastItem = items[items.length - 1];
    navigation.resourceClickHandler(
      payload.event instanceof MouseEvent ? payload.event : undefined,
      item.resourceId,
      {
        replaceId: lastItem.id ?? lastItem.resourceId
      }
    );
  }
</script>

<Breadcrumbs items={presentationItems} {limit} onItemClick={handleItemClick} />
