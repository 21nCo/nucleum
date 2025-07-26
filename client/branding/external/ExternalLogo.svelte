<script lang="ts">
  import Email from "$lib/client/icons/Email.svelte";
  import Link from "$lib/client/icons/Link.svelte";
  import Web from "$lib/client/icons/Web.svelte";
  import Phone from "$lib/client/icons/Phone.svelte";
  import { IdentityProvider } from "$lib/client/types/oauth.type";
  import Behance from "./logos/Behance.svelte";
  import Dribbble from "./logos/Dribbble.svelte";
  import FiveHundredPx from "./logos/FiveHundredPx.svelte";
  import Github from "./logos/Github.svelte";
  import Gitlab from "./logos/Gitlab.svelte";
  import Linkedin from "./logos/Linkedin.svelte";
  import Overflow from "./logos/Overflow.svelte";
  import Substack from "./logos/Substack.svelte";
  import Twitter from "./logos/Twitter.svelte";
  import Youtube from "./logos/Youtube.svelte";
  import Medium from "./logos/Medium.svelte";
  import Spotify from "./logos/Spotify.svelte";
  import Obsidian from "./logos/Obsidian.svelte";
  import Notion from "./logos/Notion.svelte";
  import Heptabase from "./logos/Heptabase.svelte";
  import Capacities from "./logos/Capacities.svelte";
  import RoamResearch from "./logos/RoamResearch.svelte";
  import Remnote from "./logos/Remnote.svelte";
  import Dynalist from "./logos/Dynalist.svelte";
  import Ideaflow from "./logos/Ideaflow.svelte";
  import Default from "./logos/Default.svelte";
  import type { IContemporary } from "$lib/client/types/featureWheel.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import Mymind from "./logos/Mymind.svelte";
  import Anytype from "./logos/Anytype.svelte";
  import Liner from "./logos/Liner.svelte";
  import Lazy from "./logos/Lazy.svelte";
  import Audiopen from "./logos/Audiopen.svelte";
  import Logseq from "./logos/Logseq.svelte";
  import Tana from "./logos/Tana.svelte";
  import Scrintal from "./logos/Scrintal.svelte";
  import Pocket from "./logos/Pocket.svelte";
  import Instapaper from "./logos/Instapaper.svelte";
  import TheBrain from "./logos/TheBrain.svelte";
  import ViennaScribe from "./logos/ViennaScribe.svelte";
  import MilaNote from "./logos/MilaNote.svelte";
  import Noted from "./logos/Noted.svelte";
  import Raindrop from "./logos/Raindrop.svelte";

  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  export let provider: IdentityProvider | string | IContemporary;
  export let width = 20;
  let className = "";
  export { className as class };
  let selected: any = Link;
  $: {
    if (provider === IdentityProvider.GenericLink) selected = Link;
    else if (provider === IdentityProvider.Behance) selected = Behance;
    else if (provider === IdentityProvider.Github) selected = Github;
    else if (provider === IdentityProvider.Dribbble) selected = Dribbble;
    else if (provider === IdentityProvider.Gitlab) selected = Gitlab;
    else if (provider === IdentityProvider.Stackoverflow) selected = Overflow;
    else if (provider === IdentityProvider.FiveHundredPx)
      selected = FiveHundredPx;
    else if (provider === IdentityProvider.Domain) selected = Web;
    else if (provider === IdentityProvider.Phone) selected = Phone;
    else if (provider === IdentityProvider.Email) selected = Email;
    else if (provider === IdentityProvider.Linkedin) selected = Linkedin;
    else if (provider === IdentityProvider.Substack) selected = Substack;
    else if (provider === IdentityProvider.Twitter) selected = Twitter;
    else if (provider === IdentityProvider.Youtube) selected = Youtube;
    else if (provider === IdentityProvider.Medium) selected = Medium;
    else if (provider === IdentityProvider.Spotify) selected = Spotify;
    else selected = Default;
  }
  $: icon =
    typeof provider === "string"
      ? provider
      : provider.icon || provider.label.toLowerCase();
  // $: console.log({ provider });
</script>

{#if icon.includes(":") && !icon.includes("svg:")}
  <Icon {icon} class={className} />
{:else}
  <svg
    {width}
    height={width}
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    x="0"
    y="0"
    viewBox="0 0 512 512"
    style="enable-background:new 0 0 512 512"
    xml:space="preserve"
    class={cn("flex justify-center items-center", className)}
    id={icon}
  >
    {#if icon.includes("svg:")}
      <SvgIcon icon={icon.replace("svg:", "")} size="fit" />
    {:else if icon === "obsidian"}
      <Obsidian />
    {:else if icon === "notion"}
      <Notion />
    {:else if icon === "capacities"}
      <Capacities />
    {:else if icon === "roam"}
      <RoamResearch />
    {:else if icon === "remnote"}
      <Remnote />
    {:else if icon === "dynalist"}
      <Dynalist />
    {:else if icon === "ideaflow"}
      <Ideaflow />
    {:else if icon === "heptabase"}
      <Heptabase />
    {:else if icon === "mymind"}
      <Mymind />
    {:else if icon === "anytype"}
      <Anytype />
    {:else if icon === "liner"}
      <Liner />
    {:else if icon === "lazy"}
      <Lazy />
    {:else if icon === "audiopen"}
      <Audiopen />
    {:else if icon === "logseq"}
      <Logseq />
    {:else if icon === "tana"}
      <Tana />
    {:else if icon === "scrintal"}
      <Scrintal />
    {:else if icon === "pocket"}
      <Pocket />
    {:else if icon === "instapaper"}
      <Instapaper />
    {:else if icon === "raindrop"}
      <Raindrop />
    {:else if icon === "thebrain"}
      <TheBrain />
    {:else if icon === "viennascribe"}
      <ViennaScribe />
    {:else if icon === "milanote"}
      <MilaNote />
    {:else if icon === "noted"}
      <Noted />
    {:else}
      <svelte:component this={selected} />
    {/if}
  </svg>
{/if}
