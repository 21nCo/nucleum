<script lang="ts">
  import { onMount } from "svelte";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";

  export let postUrl: string;

  let id: string = generateSimpleRandomId();
  let loading: boolean = true;
  let error: string = "";

  onMount(() => {
    loadFacebookWidget();
  });

  function loadFacebookWidget() {
    try {
      loading = true;

      if (!document.querySelector("#facebook-jssdk")) {
        const facebookScript = document.createElement("script");
        facebookScript.id = "facebook-jssdk";
        facebookScript.src =
          "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0";
        facebookScript.async = true;
        facebookScript.defer = true;
        facebookScript.crossOrigin = "anonymous";
        facebookScript.onload = () => {
          createFacebookEmbed();
        };
        document.head.appendChild(facebookScript);
      } else {
        createFacebookEmbed();
      }
    } catch (err) {
      console.error("Facebook widget error:", err);
      error = "Failed to load Facebook post";
      loading = false;
    }
  }

  function createFacebookEmbed() {
    try {
      const element = document.getElementById(id);
      if (element) {
        element.innerHTML = `
          <div class="fb-post" 
               data-href="${postUrl}" 
               data-width="500" 
               data-show-text="true">
            <blockquote cite="${postUrl}" class="fb-xfbml-parse-ignore">
              Loading Facebook post...
            </blockquote>
          </div>
        `;

        if (window.FB) {
          window.FB.XFBML.parse(element, () => {
            loading = false;
          });
        } else {
          setTimeout(() => {
            if (window.FB) {
              window.FB.XFBML.parse(element, () => {
                loading = false;
              });
            } else {
              error = "Facebook SDK failed to load";
              loading = false;
            }
          }, 2000);
        }
      }
    } catch (err) {
      console.error("Facebook embed creation error:", err);
      error = "Unable to load Facebook post";
      loading = false;
    }
  }

  declare global {
    interface Window {
      FB: {
        XFBML: {
          parse(element?: Element, callback?: () => void): void;
        };
      };
    }
  }
</script>

<div {id} class="w-full h-4/5 flex justify-center items-center">
  {#if loading}
    <div class="text-fgs3">Loading Facebook post...</div>
  {:else if error}
    <div class="text-red-500">{error}</div>
  {/if}
</div>
