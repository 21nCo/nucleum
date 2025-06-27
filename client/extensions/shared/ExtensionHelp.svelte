<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { createEventDispatcher } from "svelte";
  import HelpItem from "./HelpItem.svelte";

  const dispatch = createEventDispatcher();

  function openDiscord() {
    const discordUrl = "https://discord.com/invite/9HJqKYTZKg";
    window.open(discordUrl, "_blank");
  }
  function openDocs(path: string) {
    window.open(`https://docs.memotron.app/${path}`, "_blank");
  }

  const helpItems: {
    label: string;
    icon: string;
    isAwayAction?: boolean;
    callback: () => void;
  }[] = [
    {
      label: "Resync data",
      icon: "ph:arrow-counter-clockwise-light",
      callback: () => {
        dispatch("resync");
      }
    },
    {
      label: "Go to docs",
      icon: "ph:book-light",
      isAwayAction: true,
      callback: () => openDocs("")
    },
    {
      label: "See what's new",
      icon: "ph:sparkle-light",
      isAwayAction: true,
      callback: () => openDocs("changelog/memotron/tags/memotron-web-clipper")
    },
    {
      label: "Leave feedback",
      icon: "ph:chat-light",
      isAwayAction: true,
      callback: openDiscord
    },
    {
      label: "Join our Discord",
      icon: "ph:discord-logo-light",
      isAwayAction: true,
      callback: openDiscord
    }
  ];
</script>

<div class="h-full w-full flex flex-col items-center gap-8 p-4">
  <div class="flex justify-between w-full">
    <Text content="Help center" style={TextStyle.PANEL_HEADING} />
    <Button
      icon="ph:x-light"
      on:click={() => {
        dispatch("close");
      }}
    />
  </div>
  <div
    class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2 w-full overflow-y-auto"
  >
    {#each helpItems as item}
      <HelpItem {...item} on:click={() => item.callback()} />
    {/each}
  </div>
  <div class="text-fgs3 text-b2 w-full flex justify-center">
    You can also email us at&nbsp;
    <a href="mailto:hello@21n.org" class="text-aps1">hello@21n.org</a>
  </div>
  <div class="flex flex-col items-center gap-1 mt-auto text-fgs3 text-b3">
    <div>Memotron web clipper v0.57.2</div>
    <div>Last updated: June 27, 2025</div>
  </div>
</div>
