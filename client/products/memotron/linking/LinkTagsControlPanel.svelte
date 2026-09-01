<script lang="ts">
  import { logger } from "@21n/components/debug/logger.client";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import Button from "@21n/elements/button/Button.svelte";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import InlineErrorMessage from "@21n/elements/text/InlineErrorMessage.svelte";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { toasts } from "@21n/stores/notification.store";
  import view from "@21n/stores/view.store";
  import { ButtonVariant } from "@21n/types/button.type";
  import type { IRecordId } from "@21n/types/data.type";
  import { InputStyle } from "@21n/types/input.type";
  import { cn } from "@21n/utils/ui.utils";
  import { linkTagStore } from "@21n/products/memotron/linking/link.store";
  import type {
    ILinkTag,
    ILinkTagGroup
  } from "@21n/products/memotron/linking/link.type";
  import LinkTagsGroup from "@21n/products/memotron/linking/LinkTagsGroup.svelte";

  let {
    accessPoint = null
  }: {
    accessPoint?: ResourceAccessPoint | null;
  } = $props();
  let inputValue = $state("");
  let errorMessage = $state<string | null>(null);
  let isAddFocused = $state(false);
  const groups = $derived.by(() =>
    $linkTagStore
      ? linkTagStore
          .transform($linkTagStore)
          .filter((group): group is ILinkTagGroup => Boolean(group))
      : []
  );

  function resolveSavedLinkTag(result: ILinkTag | ILinkTag[] | undefined) {
    return Array.isArray(result) ? result[0] : result;
  }

  function resolveGroupItems(groupName: string) {
    return groups.find((group) => group.group === groupName)?.items ?? [];
  }

  async function save(params?: { group: string; label: string }) {
    if (!inputValue && !params?.label) {
      errorMessage = "Tag cannot be empty";
      return;
    }
    let result;
    if (params) {
      result = await linkTagStore.save(params.label, params.group);
    } else {
      result = await linkTagStore.save(inputValue);
    }
    logger.log({ at: "LinkTagsControlPanel save", result });
    const savedLinkTag = resolveSavedLinkTag(result);
    if (savedLinkTag?.label) {
      toasts.success(`**${savedLinkTag.label}** added to link tags`);
    }
    inputValue = "";
  }

  function onRemove(e: CustomEvent<IRecordId>) {
    logger.log({ at: "LinkTagsControlPanel onRemove", id: e.detail });
    linkTagStore.trash(e.detail);
  }

  function onUpdate(e: CustomEvent<{ id: IRecordId; label: string }>) {
    logger.log({ at: "LinkTagsControlPanel onUpdate", ...e.detail });
    linkTagStore.modify(e.detail.id, {
      label: e.detail.label
    });
  }

  function onUpdategroup(e: CustomEvent<{ group: string; newgroup: string }>) {
    const { group, newgroup } = e.detail;
    const tags = resolveGroupItems(group).map((item) => item.id);
    logger.log({
      at: "LinkTagsControlPanel onUpdategroup",
      group,
      newgroup,
      tags
    });
    if (tags) linkTagStore.bulkModify(tags, { group: newgroup });
  }

  async function onBulkDelete(e: CustomEvent<string>) {
    const group = e.detail;
    const tags = resolveGroupItems(group).map((item) => item.id);
    logger.log({ at: "LinkTagsControlPanel onBulkDelete", group, tags });
    if (tags) await linkTagStore.bulkTrash(tags);
    else toasts.error("No tags to delete");
  }
</script>

<div
  class={cn("flex flex-col gap-6 pt-3 w-full h-full", {
    "px-4":
      accessPoint === ResourceAccessPoint.LIBRARY ||
      accessPoint === ResourceAccessPoint.BROWSER
  })}
>
  <div class="w-full flex cw:gap-3 gap-4">
    <div
      class={cn(
        "flex-1 flex items-center px-4 h-10 border cw:rounded-md rounded-full",
        {
          "border-aps1": isAddFocused,
          "border-brs3": !isAddFocused
        }
      )}
    >
      <TextInput
        bind:value={inputValue}
        style={InputStyle.PLAIN}
        placeholder="Type relation or group:relation"
        onEnter={() => save()}
        onFocus={() => (isAddFocused = true)}
        onBlur={() => (isAddFocused = false)}
      />
    </div>
    {#if $view.isConstrainedWidth}
      <button
        class="w-14 h-full flex justify-center items-center bg-bgs2 rounded-md"
        onclick={() => save()}
      >
        <Icon icon="plus" />
      </button>
    {:else}
      <Button
        icon="plus"
        label="Add"
        type={ButtonVariant.PRIMARY}
        onclick={() => save()}
      />
    {/if}
  </div>
  {#if errorMessage}
    <InlineErrorMessage bind:error={errorMessage} />
  {/if}
  <div class="flex flex-col flex-grow gap-4 px-0.5 overflow-auto">
    {#if !groups || groups.length === 0 || groups.every((x) => x.items.length === 0)}
      <div class="flex flex-col gap-4 justify-center items-center flex-grow">
        <EmptyStatusView
          mainText="No relations found."
          subText="Add some relations to start using for link relationships."
        />
      </div>
    {:else}
      {#each groups as group}
        {#if group?.items && group.items.length > 0}
          <LinkTagsGroup
            {group}
            onSave={(e) => save(e.detail)}
            onUpdateGroupName={onUpdategroup}
            onBulkDelete={onBulkDelete}
            onRemove={onRemove}
            onUpdate={onUpdate}
          />
        {/if}
      {/each}
      <ScrollViewBottomSpacer />
    {/if}
  </div>
  <!-- <InlineInfoBanner
    type={InfoTextType.TIP}
    content="Tip: Use relations to maintain relationship information between nodes."
    action={{
      label: "Learn more",
      action:
        $appStore?.appData?.urls?.kbLinkTags ??
        "https://docs.memotron.io/page/faqs"
    }}
  /> -->
</div>
