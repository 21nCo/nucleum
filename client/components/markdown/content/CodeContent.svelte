<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import type { IBlockInterface, ICodeBlockBody } from "../md.type";
  import * as monaco from "monaco-editor";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Size } from "$lib/client/types/size.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { copyToClipboard } from "$lib/client/utils/utils";

  export let body: ICodeBlockBody;
  const dispatch = createEventDispatcher();

  let language = body?.language ?? "javascript";
  let code = body?.text ?? "";
  let element: HTMLElement;
  let editor: monaco.editor.IStandaloneCodeEditor | undefined;

  const languages = [
    { label: "ABAP", value: "abap" },
    { label: "Apex", value: "apex" },
    { label: "Azcli", value: "azcli" },
    { label: "Batch", value: "bat" },
    { label: "C", value: "c" },
    { label: "C#", value: "csharp" },
    { label: "C++", value: "cpp" },
    { label: "Clojure", value: "clojure" },
    { label: "COBOL", value: "cobol" },
    { label: "CoffeeScript", value: "coffeescript" },
    { label: "CSS", value: "css" },
    { label: "Dart", value: "dart" },
    { label: "Dockerfile", value: "dockerfile" },
    { label: "F#", value: "fsharp" },
    { label: "Go", value: "go" },
    { label: "GraphQL", value: "graphql" },
    { label: "Groovy", value: "groovy" },
    { label: "Handlebars", value: "handlebars" },
    { label: "HCL", value: "hcl" },
    { label: "HTML", value: "html" },
    { label: "INI", value: "ini" },
    { label: "Java", value: "java" },
    { label: "JavaScript", value: "javascript" },
    { label: "JSON", value: "json" },
    { label: "Julia", value: "julia" },
    { label: "Kotlin", value: "kotlin" },
    { label: "Less", value: "less" },
    { label: "Lua", value: "lua" },
    { label: "Markdown", value: "markdown" },
    { label: "MATLAB", value: "matlab" },
    { label: "MySQL", value: "mysql" },
    { label: "Objective-C", value: "objective-c" },
    { label: "Pascal", value: "pascal" },
    { label: "Perl", value: "perl" },
    { label: "PHP", value: "php" },
    { label: "PowerShell", value: "powershell" },
    { label: "Python", value: "python" },
    { label: "R", value: "r" },
    { label: "Ruby", value: "ruby" },
    { label: "Rust", value: "rust" },
    { label: "SASS", value: "scss" },
    { label: "Scala", value: "scala" },
    { label: "Scheme", value: "scheme" },
    { label: "Shell", value: "shell" },
    { label: "SQL", value: "sql" },
    { label: "Swift", value: "swift" },
    { label: "TypeScript", value: "typescript" },
    { label: "VB.Net", value: "vb" },
    { label: "XML", value: "xml" },
    { label: "YAML", value: "yaml" }
  ];

  const languagesWithSetup = [
    { label: "CSS", value: "css" },
    { label: "HTML", value: "html" },
    { label: "JavaScript", value: "javascript" },
    { label: "JSON", value: "json" },
    { label: "Plain Text", value: "plaintext" },
    { label: "TypeScript", value: "typescript" },
    { label: "Python", value: "python" },
    { label: "C", value: "c" },
    { label: "C++", value: "cpp" },
    { label: "Java", value: "java" },
    { label: "Shell", value: "shell" },
    { label: "SQL", value: "sql" }
  ];

  self.MonacoEnvironment = {
    getWorkerUrl: function (moduleId: string, label: string) {
      const basePath = "/monaco-editor/esm/vs";

      switch (label) {
        case "typescript":
        case "javascript":
          return `${basePath}/language/typescript/ts.worker.js`;
        case "json":
          return `${basePath}/language/json/json.worker.js`;
        case "css":
          return `${basePath}/language/css/css.worker.js`;
        case "html":
          return `${basePath}/language/html/html.worker.js`;
        default:
          return `${basePath}/editor/editor.worker.js`;
      }
    }
  };

  onMount(() => {
    // window.MonacoEnvironment = {
    //   getWorkerUrl: function (_moduleId: string, label: string) {
    //     const workerPath = "/monaco-editor/esm/vs/editor/editor.worker.js";

    //     switch (label) {
    //       case "typescript":
    //       case "javascript":
    //         return "/monaco-editor/esm/vs/language/typescript/ts.worker.js";
    //       case "json":
    //         return "/monaco-editor/esm/vs/language/json/json.worker.js";
    //       case "css":
    //         return "/monaco-editor/esm/vs/language/css/css.worker.js";
    //       case "html":
    //         return "/monaco-editor/esm/vs/language/html/html.worker.js";
    //       default:
    //         return workerPath;
    //     }
    //   }
    // };
    editor = monaco.editor.create(element, {
      value: code,
      language,
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      //   validateOnModelChange: false,
      parameterHints: { enabled: false },
      formatOnType: false,
      formatOnPaste: false,
      codeLens: false,
      folding: false,
      links: false
    });

    editor.getModel()?.onDidChangeContent(() => {
      code = editor!.getValue();
      dispatch("update", {
        text: code
      });
    });

    const darkModeMediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
    darkModeMediaQuery.addEventListener("change", (e) => {
      editor?.updateOptions({ theme: e.matches ? "vs-dark" : "vs" });
    });

    return () => {
      editor?.dispose();
    };
  });

  function handleLanguageChange(e: CustomEvent<string>) {
    console.log("handleLanguageChange", e, language);
    if (editor) {
      monaco.editor.setModelLanguage(editor.getModel()!, language);
    }
    dispatch("update", {
      language
    });
  }

  function handleCopyCode() {
    copyToClipboard(code ?? "");
  }
</script>

<div class="flex flex-col gap-3 w-full p-2">
  <div class="flex items-center gap-3 justify-end w-full">
    <div class="w-52 text-fgs3">
      <DropDown
        items={languages}
        style={InputStyle.PLAIN}
        size={Size.sm}
        bind:value={language}
        on:select={handleLanguageChange}
      />
    </div>
    <div class="text-fgs3">
      <Button
        icon="ph:copy-simple"
        size={Size.sm}
        tooltip="Copy code"
        on:click={handleCopyCode}
      />
    </div>
  </div>
  <div
    bind:this={element}
    style="height: 300px"
    class="rounded-md border border-brs3 overflow-hidden"
  />
</div>
