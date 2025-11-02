<script lang="ts">
  import { appStore } from "@21n/stores/app.store";
  import { Action } from "@21n/types/action.enum";
  import InlineSyncingFeedback from "@21n/elements/feedback/InlineSyncingFeedback.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import RightNavMenuItem from "./RightNavMenuItem.svelte";
</script>
<div class="h-full min-w-14 w-14 pt-12 border-l border-brs3 bg-bgs2">
    <div class="flex flex-col justify-between h-full w-full">
        <div>

            <RightNavMenuItem
            icon="search"
            tooltip="Search"
            shortcut={Action.GLOBAL_SEARCH}
            on:click={() => appStore.runAction(Action.GLOBAL_SEARCH)}
            />
            <RightNavMenuItem
            icon="terminal-window"
            tooltip="Command bar"
            shortcut={Action.CMD}
            on:click={() => appStore.runAction(Action.CMD)}
            />
        </div>
        <div>
            <RightNavMenuItem
            icon="question"
            tooltip="Help"
            on:click={() => appStore.runAction(Action.HELP)}
            />
            <InlineSyncingFeedback
            resource={Resource.everything}
            isShorter={true}
            text="Syncing..."
            />
        </div>
    </div>
</div>