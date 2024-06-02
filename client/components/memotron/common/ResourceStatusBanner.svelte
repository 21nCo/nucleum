<script lang="ts">
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import { userPreferences } from "$lib/client/stores/app.store";
  import { InfoTextType } from "$lib/client/types/text.type";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  export let resource: any;
</script>

{#if $resource.trashInformation}
  <div class="px-4">
    <InlineInfoBanner
      type={InfoTextType.ERROR}
      content={"This resource was moved to trash on: *" +
        formatDatetime(
          $userPreferences,
          new Date($resource.trashInformation.deletedAt)
        ) +
        "*"}
      action={{
        label: "Restore",
        callback: async () => {
          return resource.restore();
        }
      }}
    />
  </div>
{/if}
{#if $resource.isArchived}
  <div class="px-4">
    <InlineInfoBanner
      type={InfoTextType.INFO}
      content={"This resource was archived on: *" +
        formatDatetime($userPreferences, new Date($resource.modifiedAt)) +
        "*"}
      action={{
        label: "Unarchive",
        callback: async () => {
          return resource.unarchive();
        }
      }}
    />
  </div>
{/if}
