<script lang="ts">
  import { logger } from "@21n/components/debug/logger.client";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import Button from "@21n/elements/button/Button.svelte";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import InlineErrorMessage from "@21n/elements/text/InlineErrorMessage.svelte";
  import InlineInfoBanner from "@21n/elements/text/InlineInfoBanner.svelte";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { toasts } from "@21n/stores/notification.store";
  import view from "@21n/stores/view.store";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import type { IRecordId } from "@21n/types/data.type";
  import { InputStyle } from "@21n/types/input.type";
  import { Size } from "@21n/types/size.enum";
  import { InfoTextType } from "@21n/types/text.type";
  import { cn } from "@21n/utils/ui.utils";
  import { linkTagStore } from "@21n/products/memotron/linking/link.store";
  import type {
    ILinkTag,
    ILinkTagGroup
  } from "@21n/products/memotron/linking/link.type";
  import LinkTagsGroup from "@21n/products/memotron/linking/LinkTagsGroup.svelte";

  export let accessPoint: ResourceAccessPoint | null = null;
  let inputValue: string = "";
  let errorMessage: string | null = null;
  let isAddFocused = false;
  let groups: ILinkTagGroup[] = [];

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

  function onUpdate(e: CustomEvent<ILinkTag>) {
    logger.log({ at: "LinkTagsControlPanel onUpdate", ...e.detail });
    linkTagStore.modify(e.detail.id, e.detail);
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

  $: groups = $linkTagStore
    ? linkTagStore
        .transform($linkTagStore)
        .filter((group): group is ILinkTagGroup => Boolean(group))
    : [];
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
        on:enter={() => save()}
        on:focus={() => (isAddFocused = true)}
        on:blur={() => (isAddFocused = false)}
      />
    </div>
    {#if $view.isConstrainedWidth}
      <button
        class="w-14 h-full flex justify-center items-center bg-bgs2 rounded-md"
        on:click={() => save()}
      >
        <Icon icon="plus" />
      </button>
    {:else}
      <Button
        icon="plus"
        label="Add"
        type={ButtonVariant.PRIMARY}
        on:click={() => save()}
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
            on:save={(e) => save(e.detail)}
            on:updateGroupName={onUpdategroup}
            on:bulkDelete={onBulkDelete}
            on:remove={onRemove}
            on:update={onUpdate}
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
