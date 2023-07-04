<script lang="ts">
  import Email from "$lib/tidy/icons/Email.svelte";
  import Link from "$lib/tidy/icons/Link.svelte";
  import Web from "$lib/tidy/icons/Web.svelte";
  import Phone from "$lib/tidy/icons/Phone.svelte";
  import { IdentityProvider } from "$lib/tidy/types/identityprovider.type";
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
  export let provider: IdentityProvider;
  export let width = "20";
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
</script>

<svg
  {width}
  xmlns="http://www.w3.org/2000/svg"
  version="1.1"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  x="0"
  y="0"
  viewBox="0 0 512 512"
  style="enable-background:new 0 0 512 512"
  xml:space="preserve"
  class="w-full h-full flex justify-center items-center"
>
  <svelte:component this={selected} />
</svg>
