<script lang="ts">
  import Email from "$lib/tidy/icons/Email.svelte";
  import Link from "$lib/tidy/icons/Link.svelte";
  import Web from "$lib/tidy/icons/Web.svelte";
  import Phone from "$lib/tidy/icons/Phone.svelte";
  import { IdentityProvider } from "$lib/tidy/types/oauth.type";
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
  export let provider: IdentityProvider | string;
  export let width = 20;
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
    else selected = Link;
  }
  $: console.log({ provider });
</script>

<!-- <span class="text-b5">{provider}</span> -->
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
  class="flex justify-center items-center"
  id={provider}
>
  <!-- TODO - later load logos from link dynamically -->
  {#if provider === "obsidian"}
    <Obsidian />
  {:else if provider === "notion"}
    <Notion />
  {:else if provider === "capacities"}
    <Capacities />
  {:else if provider === "roam"}
    <RoamResearch />
  {:else if provider === "remnote"}
    <Remnote />
  {:else if provider === "dynalist"}
    <Dynalist />
  {:else if provider === "ideaflow"}
    <Ideaflow />
  {:else if provider === "tana"}
    <Notion />
  {:else if provider === "heptabase"}
    <Heptabase />
  {:else}
    <svelte:component this={selected} />
  {/if}
</svg>
