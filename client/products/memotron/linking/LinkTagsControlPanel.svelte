<script lang="ts">
  import { logger } from "$lib/client/components/debug/logger.client";
  import Button from "$lib/client/elements/button/Button.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import view from "$lib/client/stores/view.store";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { Size } from "$lib/client/types/size.enum";
  import { InfoTextType } from "$lib/client/types/text.type";
  import { linkTagStore } from "./link.store";
  import type { ILinkTag } from "./link.type";
  import LinkTagsGroup from "./LinkTagsGroup.svelte";
  let inputValue: string = "";
  let errorMessage: string | null = null;
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
    if (result) {
      toasts.success(`**${result[0]?.label}** added to link tags`);
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

  function onUpdategroup(e: CustomEvent) {
    const { group, newgroup } = e.detail;
    const tags = groups.find((x) => x.group === group)?.items.map((x) => x.id);
    logger.log({
      at: "LinkTagsControlPanel onUpdategroup",
      group,
      newgroup,
      tags
    });
    if (tags) linkTagStore.bulkModify(tags, { group: newgroup });
  }

  async function onBulkDelete(e: CustomEvent) {
    const group = e.detail;
    const tags = groups.find((x) => x.group === group)?.items.map((x) => x.id);
    logger.log({ at: "LinkTagsControlPanel onBulkDelete", group, tags });
    if (tags) await linkTagStore.bulkTrash(tags);
    else toasts.error("No tags to delete");
  }

  $: groups = $linkTagStore ? linkTagStore.transform($linkTagStore) : [];
</script>

<div class="flex flex-col gap-6 pt-3 w-full h-full">
  <div class="w-full flex cw:gap-3 gap-6">
    <TextInput
      bind:value={inputValue}
      placeholder="Type relation or group:relation to add"
      on:enter={() => save()}
    />
    {#if $view.isConstrainedWidth}
      <button
        class="w-14 h-full flex justify-center items-center bg-bgs2 rounded-md"
        on:click={() => save()}
      >
        <Icon icon="ph:plus" />
      </button>
    {:else}
      <Button
        icon="ph:plus"
        label="Add"
        type={ButtonVariant.PRIMARY}
        style={ButtonStyle.OUTLINED}
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
