<script>
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
</script>

<div class="flex flex-col gap-4 pb-32">
  <span class="text-left">
    As a concious company, however small it is, we are commited to make every
    single effort to help preserve the planet. Please help us by using Memotron
    in a green way. Read the suggestions below to become part of our mission.
  </span>
  <div class="flex flex-col gap-4 bg-bgs2 rounded-md p-4">
    <div class="flex flex-col gap-2 text-left">
      <span class="text-fgs1 text-h4">1. Use the offline version</span>
      <span class="text-fgs3 text-b2">
        If you are going to use Memotron on a single device, please download and
        use the full offline version of our app. The offline version does not
        require any internet connection or signup. It helps reduce the carbon
        emissions involved with data transfer for syncing your data continuously
        to the cloud and storing your data on the cloud.
      </span>
    </div>
  </div>
  <div class="flex flex-col gap-4 bg-bgs2 rounded-md p-4">
    <div class="flex flex-col gap-2 text-left">
      <span class="text-fgs1 text-h4">2. Turn on offline mode</span>
      <span class="text-fgs3 text-b2">
        {@html renderMdAsHtml(
          `According to your use case, if you have decided to have your data synced to the cloud, please turn on offline mode if you primarily use Memotron on a single device. Occasionally turning off the offline mode will still sync all your data to the cloud. You can toggle this setting in **Sync settings**.`
        )}
      </span>
    </div>
  </div>
  <div class="flex flex-col gap-4 bg-bgs2 rounded-md p-4">
    <div class="flex flex-col gap-2 text-left">
      <span class="text-fgs1 text-h4">3. Improve local AI along with us</span>
      <span class="text-fgs3 text-b2">
        {@html renderMdAsHtml(
          `We stumbled upon using AI locally on user's device when we were trying to cut down costs as a small startup. We soon realized the green potential of using smaller local AI models which work pretty well for most of the use cases. We are working on improving our local AI and would love your feedback. Please join our **Discord** and help us make Memotron greener.`
        )}
      </span>
    </div>
  </div>
  <span class="text-fgs3 text-b2">
    If you have any other suggestions, please let us know :).
  </span>
</div>
