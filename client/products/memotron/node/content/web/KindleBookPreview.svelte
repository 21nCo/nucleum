<script lang="ts">
  import type { IKindleBook } from "../../node.type";
  export let node: IKindleBook;
</script>

<div class="w-full h-full flex justify-center items-center">
  <div class="flex flex-col gap-5 p-4 border border-brs3 rounded-md w-3/4">
    <div class="flex w-full gap-3">
      <img
        class="rounded-md border border-brs2"
        src={node.body.imageUrl}
        alt="Book cover"
      />
      <div class="flex flex-col gap-2 items-start justify-between">
        <div class="flex flex-col gap-2 items-start">
          <div class="font-medium text-h3 text-left">
            {node.label}
          </div>
          <div class="text-b2 text-fgs2">
            Author: {node.body.author}
          </div>
        </div>
        <div>
          <div class="text-b3 text-fgs3">
            Last annotated: {node.body.lastAnnotatedDate}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
