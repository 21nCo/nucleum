<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { Action } from "$lib/client/types/action.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { preferences } from "$lib/client/stores/preferences/preferences.store";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { generateResourceId } from "$lib/client/components/flux/flux.utils";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { toasts } from "$lib/client/stores/notification.store";
  import NodularMarkdown from "../../markdown/NodularMarkdown.svelte";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import context from "$lib/client/stores/context.store";
  import type { IMarkdownTemplate } from "$lib/client/components/markdown/md.type";
  import { TimeScaleUnit } from "$lib/client/types/time.type";
  import { Preference } from "$lib/client/stores/preferences/preferences.type";
  import CalendarNotesTemplateCard from "./CalendarNotesTemplateCard.svelte";
  import { generateMarkdownText } from "$lib/client/products/memotron/node/node.utils";
  let editingTemplate: TimeScaleUnit | null = null;
  let templateMarkdown: IMarkdownTemplate = getDefaultTemplate();

  function getDefaultTemplate(): IMarkdownTemplate {
    const savedTemplate = preferences.resolve(Preference.NOTES_TEMPLATE, {
      subVariables: [editingTemplate ?? ""]
    });
    if (savedTemplate && typeof savedTemplate === "object") {
      return { ...savedTemplate } as IMarkdownTemplate;
    }
    const newBlockId = generateResourceId(Resource.node);
    return {
      body: {
        blocks: [
          {
            id: newBlockId,
            contentType: NodeType.SIMPLE_TEXT,
            body: ""
          }
        ]
      },
      childrenWithStructure: [],
      rootStructure: []
    };
  }

  function editTemplate(scale: TimeScaleUnit) {
    editingTemplate = scale;
    templateMarkdown = getDefaultTemplate();
  }

  function saveTemplate() {
    preferences.save(
      Preference.NOTES_TEMPLATE,
      {
        ...templateMarkdown,
        text: generateMarkdownText(templateMarkdown.body.blocks)
      },
      {
        subVariables: [editingTemplate ?? ""]
      }
    );
    toasts.success("Notes template saved");
    editingTemplate = null;
    return Promise.resolve(true);
  }

  function resolveDescription(scale: TimeScaleUnit) {
    return (
      preferences.resolve(Preference.NOTES_TEMPLATE, {
        subVariables: [scale]
      }) as IMarkdownTemplate | undefined
    )?.text;
  }
</script>

<div class="flex flex-col gap-6 w-full h-full p-6">
  {#if editingTemplate}
    <div class="flex flex-col gap-4 h-full w-full overflow-y-auto">
      <div class="flex items-center justify-between">
        <Text
          content={`Edit ${editingTemplate} notes template`}
          style={TextStyle.PANEL_HEADING}
        />
        <Button
          icon="ph:x-light"
          size={Size.sm}
          on:click={() => (editingTemplate = null)}
        />
      </div>

      <div class="bg-bgs2 pr-12 rounded-lg min-h-0 flex-grow flex-1">
        <NodularMarkdown
          isNodular={true}
          mdId={generateSimpleRandomId()}
          bind:md={templateMarkdown.body}
          bind:childrenWithStructure={templateMarkdown.childrenWithStructure}
          bind:rootStructure={templateMarkdown.rootStructure}
          params={{ isPreventFocusOnLoad: $context.isTouchDevice }}
        />
      </div>

      <div class="flex gap-2 justify-end">
        <Button
          type={ButtonVariant.SECONDARY}
          style={ButtonStyle.OUTLINED}
          label="Cancel"
          on:click={() => (editingTemplate = null)}
        />
        <Button
          type={ButtonVariant.PRIMARY}
          label="Update"
          icon="ph:floppy-disk-light"
          on:click={saveTemplate}
        />
      </div>
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-4">
        <Text content="Templates" style={TextStyle.SECTION_HEADING} />

        <div class="flex flex-wrap w-full gap-3">
          <CalendarNotesTemplateCard
            scale={TimeScaleUnit.DAY}
            description={resolveDescription(TimeScaleUnit.DAY)}
            onEdit={() => editTemplate(TimeScaleUnit.DAY)}
          />
          <CalendarNotesTemplateCard
            scale={TimeScaleUnit.MONTH}
            onEdit={() => editTemplate(TimeScaleUnit.MONTH)}
          />
        </div>
      </div>
    </div>

    <ModalFooter
      action={Action.CALENDAR_SETTINGS}
      secondaryAction={{
        label: "Done"
      }}
    />
  {/if}
</div>
