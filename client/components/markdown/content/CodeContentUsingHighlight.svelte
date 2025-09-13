<script lang="ts">
  import { onMount, createEventDispatcher, tick } from "svelte";
  import type { ICodeBlockBody } from "../md.type";
  import hljs from "highlight.js";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Size } from "$lib/client/types/size.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { copyToClipboard } from "$lib/client/utils/utils";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import type { MdStoreType } from "../markdown.store";
  import { hoverable } from "$lib/client/actions/hover.action";

  export let mdStore: MdStoreType;
  export let body: ICodeBlockBody;
  
  const dispatch = createEventDispatcher();

  let language = body?.language ?? "javascript";
  let code = body?.text ?? "";
  let codeElement: HTMLElement;
  let textareaElement: HTMLTextAreaElement;
  let containerElement: HTMLDivElement;
  let isHovering: boolean = false;
  let isEditing: boolean = false;
  let containerHeight: string = 'auto';

  const languages = [
    { label: "ABAP", value: "abap" },
    { label: "Apache", value: "apache" },
    { label: "Bash", value: "bash" },
    { label: "C", value: "c" },
    { label: "C#", value: "csharp" },
    { label: "C++", value: "cpp" },
    { label: "CSS", value: "css" },
    { label: "Diff", value: "diff" },
    { label: "Docker", value: "dockerfile" },
    { label: "Go", value: "go" },
    { label: "GraphQL", value: "graphql" },
    { label: "HTML", value: "html" },
    { label: "HTTP", value: "http" },
    { label: "INI", value: "ini" },
    { label: "Java", value: "java" },
    { label: "JavaScript", value: "javascript" },
    { label: "JSON", value: "json" },
    { label: "Kotlin", value: "kotlin" },
    { label: "Less", value: "less" },
    { label: "Lua", value: "lua" },
    { label: "Makefile", value: "makefile" },
    { label: "Markdown", value: "markdown" },
    { label: "Nginx", value: "nginx" },
    { label: "Objective-C", value: "objectivec" },
    { label: "PHP", value: "php" },
    { label: "Plain Text", value: "plaintext" },
    { label: "PowerShell", value: "powershell" },
    { label: "Python", value: "python" },
    { label: "R", value: "r" },
    { label: "Ruby", value: "ruby" },
    { label: "Rust", value: "rust" },
    { label: "SCSS", value: "scss" },
    { label: "Shell", value: "shell" },
    { label: "SQL", value: "sql" },
    { label: "Swift", value: "swift" },
    { label: "TypeScript", value: "typescript" },
    { label: "XML", value: "xml" },
    { label: "YAML", value: "yaml" }
  ];

  function highlightCode() {
    if (codeElement && !isEditing) {
      codeElement.removeAttribute('data-highlighted');
      hljs.highlightElement(codeElement);
    }
  }

  onMount(async () => {
    await tick();
    highlightCode();
    await tick();
    updateContainerHeight();
  });

  async function handleLanguageChange() {
    dispatch("update", {
      language
    });
    await tick();
    highlightCode();
  }

  function handleCodeChange() {
    dispatch("update", {
      text: code
    });
  }

  function handleFocus() {
    updateContainerHeight();
    isEditing = true;
  }
  
  async function handleBlur() {
    isEditing = false;
    await tick();
    highlightCode();
  }

  function updateContainerHeight() {
    if (containerElement) {
      const currentHeight = containerElement.offsetHeight;
      if (currentHeight > 0) {
        containerHeight = currentHeight + 'px';
      }
    }
  }

  function autoResize() {
    if (textareaElement) {
      textareaElement.style.height = 'auto';
      const newHeight = Math.max(300, textareaElement.scrollHeight);
      textareaElement.style.height = newHeight + 'px';
      containerHeight = newHeight + 'px';
    }
  }

  function handleCopyCode() {
    copyToClipboard(code ?? "");
  }

  function handleDeleteCode() {
    dispatch("delete");
  }

  $: if (code !== undefined && !isEditing) {
    tick().then(highlightCode);
  }
</script>

<div
  class="flex flex-col gap-3 w-full p-2 border border-brs3 rounded-md bg-[#1e1e1e]"
  use:hoverable={{
    onHover: (e) => {
      isHovering = e;
    }
  }}
>
  {#if $mdStore.params?.isReadOnly}
    <span class="text-fgs3 text-b3 px-3">
      {languages.find((l) => l.value === language)?.label ?? "Code"}
    </span>
  {:else}
    <div class="flex items-center gap-3 justify-between w-full h-8">
      <div class="w-32 text-fgs3 px-3">
        <DropDown
          items={languages}
          style={InputStyle.PLAIN}
          size={Size.sm}
          popoverWidth="w-60"
          bind:value={language}
          on:select={handleLanguageChange}
        />
      </div>
      {#if isHovering}
        <div class="flex gap-2 items-center text-fgs3">
          <Button
            icon="copy"
            size={Size.sm}
            tooltip="Copy code"
            style={ButtonStyle.OUTLINED}
            on:click={handleCopyCode}
          />
          <Button
            icon="trash"
            size={Size.sm}
            type={ButtonVariant.DANGER}
            style={ButtonStyle.OUTLINED}
            tooltip="Delete block"
            on:click={handleDeleteCode}
          />
        </div>
      {/if}
    </div>
  {/if}

  <div 
    bind:this={containerElement}
    class="relative rounded-md overflow-hidden code-container"
    style="min-height: 300px; height: {containerHeight};"
  >
    {#if $mdStore.params?.isReadOnly}
      <pre class="hljs m-0 p-4 text-sm font-mono leading-relaxed overflow-x-auto h-full"><code 
        bind:this={codeElement} 
        class="language-{language || 'plaintext'}"
      >{code}</code></pre>
    {:else if isEditing}
      <!-- Simple textarea when editing -->
      <textarea
        bind:this={textareaElement}
        bind:value={code}
        on:input={() => { handleCodeChange(); autoResize(); }}
        on:focus={handleFocus}
        on:blur={handleBlur}
        class="bg-[#1e1e1e] text-[#d4d4d4] p-4 text-sm font-mono leading-relaxed resize-none w-full h-full border-none outline-none rounded-md"
        placeholder="Enter your code here..."
        spellcheck={false}
        style="font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; min-height: 300px;"
      />
    {:else}
      <!-- Syntax highlighted view -->
      <pre 
        class="hljs m-0 p-4 text-sm font-mono leading-relaxed overflow-x-auto cursor-text h-full"
        style="min-height: 300px;"
        on:click={async () => {
          isEditing = true;
          await tick();
          textareaElement?.focus();
          autoResize();
        }}
      ><code 
        bind:this={codeElement} 
        class="language-{language || 'plaintext'}"
      >{code || 'Click to edit code...'}</code></pre>
    {/if}
  </div>
</div>

<style>
  .code-container {
    transition: height 0.1s ease-out;
    box-sizing: border-box;
  }
  
  .code-container pre,
  .code-container textarea {
    box-sizing: border-box;
    margin: 0;
    padding: 16px;
    font-size: 14px;
    line-height: 1.5;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  }
  
  .code-container pre {
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  
  .code-container textarea {
    resize: none;
    outline: none;
    border: none;
    background: #1e1e1e;
    color: #d4d4d4;
  }
  
  .code-container textarea::placeholder {
    color: #6a6a6a;
  }

  :global(.hljs) {
    background: #1e1e1e !important;
    color: #d4d4d4;
  }
  
  :global(.hljs-keyword) {
    color: #569cd6;
  }
  
  :global(.hljs-string) {
    color: #ce9178;
  }
  
  :global(.hljs-number) {
    color: #b5cea8;
  }
  
  :global(.hljs-comment) {
    color: #6a9955;
    font-style: italic;
  }
  
  :global(.hljs-function) {
    color: #dcdcaa;
  }
  
  :global(.hljs-variable) {
    color: #9cdcfe;
  }
  
  :global(.hljs-type) {
    color: #4ec9b0;
  }
  
  :global(.hljs-class) {
    color: #4ec9b0;
  }
  
  :global(.hljs-tag) {
    color: #569cd6;
  }
  
  :global(.hljs-attr) {
    color: #92c5f8;
  }
  
  :global(.hljs-value) {
    color: #ce9178;
  }

  :global(.hljs-built_in) {
    color: #4ec9b0;
  }

  :global(.hljs-literal) {
    color: #569cd6;
  }

  :global(.hljs-title) {
    color: #dcdcaa;
  }

  :global(.hljs-params) {
    color: #d4d4d4;
  }
</style>
