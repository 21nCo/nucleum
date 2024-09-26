<script lang="ts">
  import { logger } from "$lib/client/components/debug/logger.client";
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { toasts } from "$lib/client/stores/notification.store";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { linkTagStore } from "./link.store";
  import type { ILinkTag } from "./link.type";
  import LinkTagsGroup from "./LinkTagsGroup.svelte";
  let inputValue: string = "";

  async function save(params?: { group: string; label: string }) {
    let group = params?.group;
    let label = params?.label;
    if (!params) {
      if (inputValue.includes(":")) {
        group = inputValue.split(":")[0];
        label = inputValue.split(":")[1];
      } else {
        label = inputValue;
      }
    }
    if (!label) {
      toasts.error("No label provided");
      return;
    }
    let result = await linkTagStore.save(label, group);
    logger.debug({ at: "LinkTagsControlPanel save", result });
    if (result) {
      toasts.success(`**${label}** added to link tags`);
    }
    inputValue = "";
  }

  function onRemove(e: CustomEvent<IRecordId>) {
    logger.debug({ at: "LinkTagsControlPanel onRemove", id: e.detail });
    linkTagStore.trash(e.detail);
  }

  function onUpdate(e: CustomEvent<ILinkTag>) {
    logger.debug({ at: "LinkTagsControlPanel onUpdate", ...e.detail });
    linkTagStore.modify(e.detail.id, e.detail);
  }

  function onUpdategroup(e: CustomEvent) {
    const { group, newgroup } = e.detail;
    const tags = groups.find((x) => x.group === group)?.items.map((x) => x.id);
    logger.debug({
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
    logger.debug({ at: "LinkTagsControlPanel onBulkDelete", group, tags });
    if (tags) await linkTagStore.bulkTrash(tags);
    else toasts.error("No tags to delete");
  }

  $: groups = linkTagStore.transform($linkTagStore);
  $: console.log({ groups, linkTags: $linkTagStore });
</script>

<div class="flex flex-col gap-12 w-full h-full">
  <div class="w-full flex gap-6">
    <TextInput
      bind:value={inputValue}
      placeholder="Type tag or group:tag to add"
      on:enter={() => save()}
    />
    <Button
      icon="ph:plus"
      label="Add"
      type={ButtonVariant.PRIMARY}
      style={ButtonStyle.OUTLINED}
      on:click={() => save()}
    />
  </div>
  <div class="flex flex-col gap-6 overflow-auto">
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
  </div>
</div>
