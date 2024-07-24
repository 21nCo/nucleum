<script lang="ts">
  import { AlertType } from "$lib/client/types/notification.type";
  import { cn } from "$lib/client/utils/ui.utils";

  export let feedback: { message: string; type: AlertType } | string = "";
</script>

<div
  class={cn("flex w-full justify-center text-b2 h-4", {
    "text-fgs3": typeof feedback === "string",
    "text-ags1":
      typeof feedback != "string" && feedback?.type === AlertType.SUCCESS,
    "text-ars1":
      typeof feedback != "string" && feedback?.type === AlertType.ERROR
  })}
>
  {typeof feedback == "string" ? feedback : feedback.message}
</div>
