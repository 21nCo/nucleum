<script lang="ts">
  import { generateUID } from "@21n/utils/utils";
  let savedNode: Node | null = null;
  let savedOffset: number | null = null;
  let innerHTML = "";
  function saveCaretPosition() {
    const selection = window.getSelection();
    if (selection) {
      savedNode = selection.focusNode;
      savedOffset = selection.focusOffset;
    }
  }
  function restoreCaretPosition() {
    console.log("restoreCaretPosition", savedNode, savedOffset);
    const selection = window.getSelection();
    if (selection && savedNode && savedOffset !== null) {
      const range = document.createRange();
      range.setStart(savedNode, savedOffset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  function handleKeyUp(event: KeyboardEvent) {
    // console.log("handleKeyUp", event);
    const id = generateUID();
    innerHTML = innerHTML.toUpperCase(); //+ `<span id=${id} >_<span>`;
    restoreCaretPosition();
  }
  function handleKeyDown(event: KeyboardEvent) {
    console.log("handleKeyDown", event);
    saveCaretPosition();
  }
  function handleKeyPress(event: KeyboardEvent) {
    //console.log("handleKeyPress", event);
  }
</script>

<div
  class="w-full h-40 border"
  contenteditable
  bind:innerHTML
  placeholder="type something here..."
  data-index="asdd"
  onkeyup={handleKeyUp}
  onkeydown={handleKeyDown}
  onkeypress={handleKeyPress}
></div>

<style>
  div[contenteditable]:empty::after {
    content: attr(placeholder);
    color: rgba(var(--colors-fgs3), 1);
  }
</style>
