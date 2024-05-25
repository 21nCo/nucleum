<script lang="ts">
  import { dev } from "$app/environment";
  import { inject } from "@vercel/analytics";
  const gaTag = localStorage.getItem("gaTag");
  const clarityTag = localStorage.getItem("clarityTag");
  inject({ mode: dev ? "development" : "production" });
</script>

<svelte:head>
  {#if gaTag}
    <script
      async
      src="https://www.googletagmanager.com/gtag/js?id={gaTag}"
    ></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag("js", new Date());
      const gaTag = localStorage.getItem("gaTag");
      gtag("config", gaTag);
    </script>
  {/if}
  {#if clarityTag}
    <script type="text/javascript">
      (function (c, l, a, r, i, t, y) {
        c[a] =
          c[a] ||
          function () {
            (c[a].q = c[a].q || []).push(arguments);
          };
        t = l.createElement(r);
        t.async = 1;
        i = localStorage.getItem("clarityTag") || "";
        t.src = "https://www.clarity.ms/tag/" + i;
        y = l.getElementsByTagName(r)[0];
        y.parentNode.insertBefore(t, y);
      })(window, document, "clarity", "script");
    </script>
  {/if}
</svelte:head>
