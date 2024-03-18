<script lang="ts">
  import { intercomId } from "$lib/tidy/stores/app.store";
  import account from "$lib/tidy/stores/account.store";
  import view from "$lib/tidy/stores/view.store";
  localStorage.setItem("intercomId", intercomId);
  $: if (!$view.isPortrait && $account.userInfo) {
    (<any>window).intercomSettings = {
      api_base: "https://api-iam.intercom.io",
      app_id: intercomId,
      name: $account.userInfo?.nickName,
      user_id: $account.userId ?? $account.userInfo?.id,
      email: $account.userInfo?.email ?? ""
    };
    if ((<any>window).Intercom)
      (<any>window).Intercom("update", {
        hide_default_launcher: true
      });
  }
</script>

<svelte:head>
  <script>
    (function () {
      var w = window;
      var ic = w.Intercom;
      if (typeof ic === "function") {
        ic("reattach_activator");
        ic("update", w.intercomSettings);
      } else {
        var d = document;
        var i = function () {
          i.c(arguments);
        };
        i.q = [];
        i.c = function (args) {
          i.q.push(args);
        };
        w.Intercom = i;
        var l = function () {
          var s = d.createElement("script");
          s.type = "text/javascript";
          s.async = true;
          const intercomId = localStorage.getItem("intercomId");
          s.src = "https://widget.intercom.io/widget/" + intercomId;
          var x = d.getElementsByTagName("script")[0];
          x.parentNode.insertBefore(s, x);
        };
        if (document.readyState === "complete") {
          l();
        } else if (w.attachEvent) {
          w.attachEvent("onload", l);
        } else {
          w.addEventListener("load", l, false);
        }
      }
    })();
  </script>
</svelte:head>
