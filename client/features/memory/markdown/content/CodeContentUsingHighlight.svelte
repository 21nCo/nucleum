<script module lang="ts">
  import hljs from "highlight.js/lib/core";
  import apache from "highlight.js/lib/languages/apache";
  import bash from "highlight.js/lib/languages/bash";
  import c from "highlight.js/lib/languages/c";
  import csharp from "highlight.js/lib/languages/csharp";
  import cpp from "highlight.js/lib/languages/cpp";
  import css from "highlight.js/lib/languages/css";
  import diff from "highlight.js/lib/languages/diff";
  import dockerfile from "highlight.js/lib/languages/dockerfile";
  import go from "highlight.js/lib/languages/go";
  import graphql from "highlight.js/lib/languages/graphql";
  import http from "highlight.js/lib/languages/http";
  import ini from "highlight.js/lib/languages/ini";
  import java from "highlight.js/lib/languages/java";
  import javascript from "highlight.js/lib/languages/javascript";
  import json from "highlight.js/lib/languages/json";
  import kotlin from "highlight.js/lib/languages/kotlin";
  import less from "highlight.js/lib/languages/less";
  import lua from "highlight.js/lib/languages/lua";
  import makefile from "highlight.js/lib/languages/makefile";
  import markdown from "highlight.js/lib/languages/markdown";
  import nginx from "highlight.js/lib/languages/nginx";
  import objectivec from "highlight.js/lib/languages/objectivec";
  import php from "highlight.js/lib/languages/php";
  import plaintext from "highlight.js/lib/languages/plaintext";
  import powershell from "highlight.js/lib/languages/powershell";
  import python from "highlight.js/lib/languages/python";
  import r from "highlight.js/lib/languages/r";
  import ruby from "highlight.js/lib/languages/ruby";
  import rust from "highlight.js/lib/languages/rust";
  import scss from "highlight.js/lib/languages/scss";
  import shell from "highlight.js/lib/languages/shell";
  import sql from "highlight.js/lib/languages/sql";
  import swift from "highlight.js/lib/languages/swift";
  import typescript from "highlight.js/lib/languages/typescript";
  import xml from "highlight.js/lib/languages/xml";
  import yaml from "highlight.js/lib/languages/yaml";

  const grammarLoaders = import.meta.glob<{ default: import("highlight.js").LanguageFn }>(
    "../../../../../node_modules/highlight.js/es/languages/!(*.js).js"
  );
  let grammarQueue = Promise.resolve();
  let allGrammars: Promise<void> | undefined;
  const missingGrammars = new Set<string>();

  /**
   * Recursively loads subLanguage dependencies, guarding cycles with visited.
   * Alias fallback loads all grammars once and caches IDs that remain missing.
   */
  async function resolveGrammar(language: string, visited: Set<string>) {
    if (hljs.getLanguage(language) || missingGrammars.has(language) || visited.has(language)) return;
    visited.add(language);
    const load = grammarLoaders[`../../../../../node_modules/highlight.js/es/languages/${language}.js`];
    if (!load) {
      allGrammars ??= Promise.all(Object.entries(grammarLoaders).map(async ([path, loader]) => {
        const { default: grammar } = await loader();
        return { language: path.slice(path.lastIndexOf("/") + 1, -3), grammar };
      })).then((grammars) => {
        for (const { language, grammar } of grammars) hljs.registerLanguage(language, grammar);
      }).catch((error) => {
        allGrammars = undefined;
        throw error;
      });
      await allGrammars;
      if (!hljs.getLanguage(language)) missingGrammars.add(language);
      return;
    }
    const { default: grammar } = await load();
    const dependencies = new Set<string>();
    const modes = new Set<object>();
    function collect(mode: unknown) {
      if (!mode || typeof mode !== "object" || modes.has(mode)) return;
      modes.add(mode);
      const { subLanguage, contains, starts, variants } = mode as {
        subLanguage?: string | string[];
        contains?: unknown[];
        starts?: unknown;
        variants?: unknown[];
      };
      for (const name of typeof subLanguage === "string" ? [subLanguage] : subLanguage ?? []) {
        dependencies.add(name);
      }
      contains?.forEach(collect);
      variants?.forEach(collect);
      collect(starts);
    }
    collect(grammar(hljs));
    for (const dependency of dependencies) await resolveGrammar(dependency, visited);
    hljs.registerLanguage(language, grammar);
  }

  /** Serializes grammar loads, recovering the queue after a failed load. */
  function loadGrammar(language: string) {
    grammarQueue = grammarQueue.catch(() => {}).then(() => resolveGrammar(language, new Set()));
    return grammarQueue;
  }

  hljs.registerLanguage("apache", apache);
  hljs.registerLanguage("bash", bash);
  hljs.registerLanguage("c", c);
  hljs.registerLanguage("csharp", csharp);
  hljs.registerLanguage("cpp", cpp);
  hljs.registerLanguage("css", css);
  hljs.registerLanguage("diff", diff);
  hljs.registerLanguage("dockerfile", dockerfile);
  hljs.registerLanguage("go", go);
  hljs.registerLanguage("graphql", graphql);
  hljs.registerLanguage("http", http);
  hljs.registerLanguage("ini", ini);
  hljs.registerLanguage("java", java);
  hljs.registerLanguage("javascript", javascript);
  hljs.registerLanguage("json", json);
  hljs.registerLanguage("kotlin", kotlin);
  hljs.registerLanguage("less", less);
  hljs.registerLanguage("lua", lua);
  hljs.registerLanguage("makefile", makefile);
  hljs.registerLanguage("markdown", markdown);
  hljs.registerLanguage("nginx", nginx);
  hljs.registerLanguage("objectivec", objectivec);
  hljs.registerLanguage("php", php);
  hljs.registerLanguage("plaintext", plaintext);
  hljs.registerLanguage("powershell", powershell);
  hljs.registerLanguage("python", python);
  hljs.registerLanguage("r", r);
  hljs.registerLanguage("ruby", ruby);
  hljs.registerLanguage("rust", rust);
  hljs.registerLanguage("scss", scss);
  hljs.registerLanguage("shell", shell);
  hljs.registerLanguage("sql", sql);
  hljs.registerLanguage("swift", swift);
  hljs.registerLanguage("typescript", typescript);
  hljs.registerLanguage("xml", xml);
  hljs.registerLanguage("yaml", yaml);
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
  for (const { value } of languages) {
    if (!hljs.getLanguage(value)) missingGrammars.add(value);
  }
</script>

<script lang="ts">
  import { onMount, tick } from "svelte";
  import type { ICodeBlockBody } from "@nucleum/features/memory/markdown/md.type";
  import DropDown from "@21n/ui/elements/dropdown/DropDown.svelte";
  import { InputStyle } from "@21n/ui/elements/input/input.type";
  import { Size } from "@21n/ui/elements/size.enum";
  import Button from "@21n/ui/elements/button/Button.svelte";
  import { copyToClipboard } from "@21n/shared-utils/clipboard";
  import { ButtonStyle, ButtonVariant } from "@21n/ui/elements/button/button.type";
  import type { MdStoreType } from "@nucleum/features/memory/markdown/markdown.store";
  import { hoverable } from "@21n/ui/actions/hover.action";

  let {
    mdStore,
    body,
    onUpdate = undefined,
    onDelete = undefined
  }: {
    mdStore: MdStoreType;
    body: ICodeBlockBody;
    onUpdate?: ((event: CustomEvent<any>) => void) | undefined;
    onDelete?: (() => void) | undefined;
  } = $props();

  let language = $state(body?.language ?? "javascript");
  let code = $state(body?.text ?? "");
  let codeElement: HTMLElement;
  let textareaElement: HTMLTextAreaElement;
  let containerElement: HTMLDivElement;
  let isHovering = $state(false);
  let isEditing = $state(false);
  let containerHeight = $state("auto");


  async function highlightCode() {
    const requestedLanguage = language || "plaintext";
    try {
      await loadGrammar(requestedLanguage.toLowerCase());
    } catch {
      return;
    }
    if (requestedLanguage !== (language || "plaintext")) return;
    if (codeElement && !isEditing) {
      codeElement.removeAttribute("data-highlighted");
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
    onUpdate?.(new CustomEvent("update", { detail: { language } }));
    await tick();
    highlightCode();
  }

  function handleCodeChange() {
    onUpdate?.(new CustomEvent("update", { detail: { text: code } }));
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
        containerHeight = currentHeight + "px";
      }
    }
  }

  function autoResize() {
    if (textareaElement) {
      textareaElement.style.height = "auto";
      const newHeight = Math.max(300, textareaElement.scrollHeight);
      textareaElement.style.height = newHeight + "px";
      containerHeight = newHeight + "px";
    }
  }

  function handleCopyCode() {
    copyToClipboard(code ?? "");
  }

  function handleDeleteCode() {
    onDelete?.();
  }

  $effect(() => {
    if (code === undefined || isEditing) return;
    tick().then(highlightCode);
  });
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
          onSelect={handleLanguageChange}
        />
      </div>
      {#if isHovering}
        <div class="flex gap-2 items-center text-fgs3">
          <Button
            icon="copy"
            size={Size.sm}
            tooltip="Copy code"
            style={ButtonStyle.OUTLINED}
            onclick={handleCopyCode}
          />
          <Button
            icon="trash"
            size={Size.sm}
            type={ButtonVariant.DANGER}
            style={ButtonStyle.OUTLINED}
            tooltip="Delete block"
            onclick={handleDeleteCode}
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
      <textarea
        bind:this={textareaElement}
        bind:value={code}
        oninput={() => {
          handleCodeChange();
          autoResize();
        }}
        onfocus={handleFocus}
        onblur={handleBlur}
        class="bg-[#1e1e1e] text-[#d4d4d4] p-4 text-sm font-mono leading-relaxed resize-none w-full h-full border-none outline-none rounded-md"
        placeholder="Enter your code here..."
        spellcheck={false}
        style="font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; min-height: 300px;"
      />
    {:else}
      <button
        type="button"
        class="block h-full w-full cursor-text border-none bg-transparent p-0 text-left"
        onclick={async () => {
          isEditing = true;
          await tick();
          textareaElement?.focus();
          autoResize();
        }}
      >
        <pre
          class="hljs m-0 p-4 text-sm font-mono leading-relaxed overflow-x-auto h-full"
          style="min-height: 300px;"
        ><code
          bind:this={codeElement}
          class="language-{language || 'plaintext'}"
        >{code || "Click to edit code..."}</code></pre>
      </button>
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
