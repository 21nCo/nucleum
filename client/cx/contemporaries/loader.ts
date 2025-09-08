import type { IContemporary } from "../../types/featureWheel.type";
import { Contemporary } from "../../components/featureWheel/comparer.type";
import obsidianData from "./obsidian.json";
import notionData from "./notion.json";
import capacitiesData from "./capacities.json";
import logseqData from "./logseq.json";
import mymindData from "./mymind.json";
import raindropData from "./raindrop.json";
import applennotesData from "./applenotes.json";
import evernoteData from "./evernote.json";
import anytypeData from "./anytype.json";
import roamData from "./roam.json";
import remnoteData from "./remnote.json";
import craftData from "./craft.json";
import linerData from "./liner.json";
import memData from "./mem.json";
import weavaData from "./weava.json";
import diigoData from "./diigo.json";
import glaspData from "./glasp.json";
import hypothesisData from "./hypothesis.json";

const jsonDataMap: Partial<Record<Contemporary, IContemporary>> = {
  [Contemporary.Obsidian]: obsidianData as IContemporary,
  [Contemporary.Notion]: notionData as IContemporary,
  [Contemporary.Capacities]: capacitiesData as IContemporary,
  [Contemporary.Logseq]: logseqData as IContemporary,
  [Contemporary.Mymind]: mymindData as IContemporary,
  [Contemporary.Raindrop]: raindropData as IContemporary,
  [Contemporary.AppleNotes]: applennotesData as IContemporary,
  [Contemporary.Evernote]: evernoteData as IContemporary,
  [Contemporary.Anytype]: anytypeData as IContemporary,
  [Contemporary.Roam]: roamData as IContemporary,
  [Contemporary.Remnote]: remnoteData as IContemporary,
  [Contemporary.Craft]: craftData as IContemporary,
  [Contemporary.Liner]: linerData as IContemporary,
  [Contemporary.Mem]: memData as IContemporary,
  [Contemporary.WeavaHighlighter]: weavaData as IContemporary,
  [Contemporary.Diigo]: diigoData as IContemporary,
  [Contemporary.Glasp]: glaspData as IContemporary,
  [Contemporary.Hypothesis]: hypothesisData as IContemporary
};

/**
 * Get default contemporary data for cases where JSON file doesn't exist
 */
function getDefaultContemporaryData(contemporary: Contemporary): IContemporary {
  // Default entries for contemporaries that don't have JSON files yet
  const defaults: Partial<Record<Contemporary, IContemporary>> = {
    [Contemporary.Tana]: {
      label: Contemporary.Tana,
      url: "https://tana.inc",
      price: 15,
      sourcingType: "CLOSED"
    } as IContemporary,
    [Contemporary.Heptabase]: {
      label: Contemporary.Heptabase,
      url: "https://heptabase.com",
      price: 8.99,
      sourcingType: "CLOSED"
    } as IContemporary,
    [Contemporary.Readwise]: {
      label: Contemporary.Readwise,
      url: "https://readwise.io",
      price: 9.99,
      sourcingType: "CLOSED"
    } as IContemporary,
    [Contemporary.AudioPen]: {
      label: Contemporary.AudioPen,
      url: "https://audiopen.ai/",
      price: 8.25,
      sourcingType: "CLOSED"
    } as IContemporary,
    [Contemporary.ViennaScribe]: {
      label: Contemporary.ViennaScribe,
      url: "",
      icon: "viennascribe"
    } as IContemporary,
    [Contemporary.MilaNote]: {
      label: Contemporary.MilaNote,
      url: ""
    } as IContemporary,
    [Contemporary.Noted]: {
      label: Contemporary.Noted,
      url: ""
    } as IContemporary,
    [Contemporary.TheBrain]: {
      label: Contemporary.TheBrain,
      url: ""
    } as IContemporary,
    [Contemporary.Bear]: { label: Contemporary.Bear, url: "" } as IContemporary,
    [Contemporary.Scrivener]: {
      label: Contemporary.Scrivener,
      url: ""
    } as IContemporary,
    [Contemporary.Ulysses]: {
      label: Contemporary.Ulysses,
      url: ""
    } as IContemporary,
    [Contemporary.Drafts]: {
      label: Contemporary.Drafts,
      url: ""
    } as IContemporary,
    [Contemporary.AppFlowy]: {
      label: Contemporary.AppFlowy,
      url: ""
    } as IContemporary,
    [Contemporary.Scrintal]: {
      label: Contemporary.Scrintal,
      url: ""
    } as IContemporary,
    [Contemporary.Scapple]: {
      label: Contemporary.Scapple,
      url: ""
    } as IContemporary,
    [Contemporary.Scriv]: {
      label: Contemporary.Scriv,
      url: ""
    } as IContemporary,
    [Contemporary.Supernotes]: {
      label: Contemporary.Supernotes,
      url: ""
    } as IContemporary,
    [Contemporary.Walling]: {
      label: Contemporary.Walling,
      url: ""
    } as IContemporary,
    [Contemporary.XMind]: {
      label: Contemporary.XMind,
      url: ""
    } as IContemporary,
    [Contemporary.Instapaper]: {
      label: Contemporary.Instapaper,
      url: ""
    } as IContemporary,
    [Contemporary.OneNote]: {
      label: Contemporary.OneNote,
      url: ""
    } as IContemporary,
    [Contemporary.Voicenotes]: {
      label: Contemporary.Voicenotes,
      url: "https://voicenotes.com/"
    } as IContemporary,
    [Contemporary.Milanote]: {
      label: Contemporary.Milanote,
      url: "https://milanote.com/"
    } as IContemporary,
    [Contemporary.Pinterest]: {
      label: Contemporary.Pinterest,
      url: "https://pinterest.com"
    } as IContemporary,
    [Contemporary.Effie]: {
      label: Contemporary.Effie,
      url: "https://www.effie.pro/"
    } as IContemporary,
    [Contemporary.ZohoNotebook]: {
      label: Contemporary.ZohoNotebook,
      url: "https://notebook.zoho.com"
    } as IContemporary,
    [Contemporary.Karakeep]: {
      label: Contemporary.Karakeep,
      url: "https://karakeep.app/"
    } as IContemporary,
    [Contemporary.Kortex]: {
      label: Contemporary.Kortex,
      url: "https://kortex.co"
    } as IContemporary,
    [Contemporary.Noteey]: {
      label: Contemporary.Noteey,
      url: "https://noteey.cn/"
    } as IContemporary,
    [Contemporary.SaveDay]: {
      label: Contemporary.SaveDay,
      url: "https://www.save.day/"
    } as IContemporary,
    [Contemporary.Stacks]: {
      label: Contemporary.Stacks,
      url: "https://betterstacks.com/"
    } as IContemporary,
    [Contemporary.DetaSurf]: {
      label: Contemporary.DetaSurf,
      url: "https://deta.surf"
    } as IContemporary,
    [Contemporary.QwikNotes]: {
      label: Contemporary.QwikNotes,
      url: "https://qwiknotes.com/"
    } as IContemporary,
    [Contemporary.Fablehenge]: {
      label: Contemporary.Fablehenge,
      url: "https://www.fablehenge.com/"
    } as IContemporary,
    [Contemporary.Glasp]: {
      label: Contemporary.Glasp,
      url: "https://glasp.co/"
    } as IContemporary,
    [Contemporary.SuperMemory]: {
      label: Contemporary.SuperMemory,
      url: "https://supermemory.ai/"
    } as IContemporary,
    [Contemporary.MyLifeNote]: {
      label: Contemporary.MyLifeNote,
      url: "https://mylifenote.ai/"
    } as IContemporary,
    [Contemporary.OpenNotas]: {
      label: Contemporary.OpenNotas,
      url: "https://opennotas.io/"
    } as IContemporary,
    [Contemporary.Otio]: {
      label: Contemporary.Otio,
      url: "https://otio.ai"
    } as IContemporary,
    [Contemporary.MicroBlog]: {
      label: Contemporary.MicroBlog,
      url: "https://micro.blog/"
    } as IContemporary,
    [Contemporary.CoolStuff]: {
      label: Contemporary.CoolStuff,
      url: "https://coolstuff.app/"
    } as IContemporary,
    [Contemporary.ThinkMachine]: {
      label: Contemporary.ThinkMachine,
      url: "https://thinkmachine.com/"
    } as IContemporary,
    [Contemporary.BetterDictation]: {
      label: Contemporary.BetterDictation,
      url: "https://betterdictation.com/"
    } as IContemporary,
    [Contemporary.Outline]: {
      label: Contemporary.Outline,
      url: "https://www.outline.app/"
    } as IContemporary,
    [Contemporary.AmpleNote]: {
      label: Contemporary.AmpleNote,
      url: "https://www.amplenote.com/"
    } as IContemporary,
    [Contemporary.Memex]: {
      label: Contemporary.Memex,
      url: "https://memex.garden/"
    } as IContemporary,
    [Contemporary.OneWriter]: {
      label: Contemporary.OneWriter,
      url: ""
    } as IContemporary,
    [Contemporary.IAWriter]: {
      label: Contemporary.IAWriter,
      url: ""
    } as IContemporary,
    [Contemporary.Zettlr]: {
      label: Contemporary.Zettlr,
      url: "https://zettlr.com/"
    } as IContemporary,
    [Contemporary.TheArchive]: {
      label: Contemporary.TheArchive,
      url: "https://zettelkasten.de/"
    } as IContemporary,
    [Contemporary.Trickle]: {
      label: Contemporary.Trickle,
      url: "https://www.trickle.so/"
    } as IContemporary,
    [Contemporary.Emberly]: {
      label: Contemporary.Emberly,
      url: "https://ember.ly/"
    } as IContemporary,
    [Contemporary.Saga]: {
      label: Contemporary.Saga,
      url: "https://saga.so/"
    } as IContemporary,
    [Contemporary.Strut]: {
      label: Contemporary.Strut,
      url: "https://strut.so/"
    } as IContemporary,
    [Contemporary.HeyMind]: {
      label: Contemporary.HeyMind,
      url: "https://heymind.co/"
    } as IContemporary,
    [Contemporary.Beloga]: {
      label: Contemporary.Beloga,
      url: "https://www.beloga.xyz/"
    } as IContemporary,
    [Contemporary.Joplin]: {
      label: Contemporary.Joplin,
      url: "https://joplinapp.org/"
    } as IContemporary,
    [Contemporary.WeTransferCollect]: {
      label: Contemporary.WeTransferCollect,
      url: ""
    } as IContemporary,
    [Contemporary.Noteledge]: {
      label: Contemporary.Noteledge,
      url: "https://www.kdanmobile.com/noteledge"
    } as IContemporary,
    [Contemporary.RedNotebook]: {
      label: Contemporary.RedNotebook,
      url: "https://rednotebook.app/"
    } as IContemporary,
    [Contemporary.Slite]: {
      label: Contemporary.Slite,
      url: "https://slite.com/"
    } as IContemporary,
    [Contemporary.StandardNotes]: {
      label: Contemporary.StandardNotes,
      url: "https://standardnotes.com/features"
    } as IContemporary,
    [Contemporary.Trilium]: {
      label: Contemporary.Trilium,
      url: "https://github.com/zadam/trilium"
    } as IContemporary,
    [Contemporary.Typora]: {
      label: Contemporary.Typora,
      url: "https://typora.io/"
    } as IContemporary,
    [Contemporary.Hypothesis]: {
      label: Contemporary.Hypothesis,
      url: "https://web.hypothes.is/"
    } as IContemporary,
    [Contemporary.Dendron]: {
      label: Contemporary.Dendron,
      url: "https://www.dendron.so/"
    } as IContemporary,
    [Contemporary.DEVONThink]: {
      label: Contemporary.DEVONThink,
      url: "https://www.devontechnologies.com/apps/devonthink"
    } as IContemporary,
    [Contemporary.Mendeley]: {
      label: Contemporary.Mendeley,
      url: ""
    } as IContemporary,
    [Contemporary.MarginNotes]: {
      label: Contemporary.MarginNotes,
      url: ""
    } as IContemporary,
    [Contemporary.Reflect]: {
      label: Contemporary.Reflect,
      url: "https://reflect.app"
    } as IContemporary,
    [Contemporary.GoogleKeep]: {
      label: Contemporary.GoogleKeep,
      url: ""
    } as IContemporary,
    [Contemporary.Noto]: { label: Contemporary.Noto, url: "" } as IContemporary,
    [Contemporary.Flow]: { label: Contemporary.Flow, url: "" } as IContemporary,
    [Contemporary.Concepts]: {
      label: Contemporary.Concepts,
      url: ""
    } as IContemporary,
    [Contemporary.Confluence]: {
      label: Contemporary.Confluence,
      url: "https://www.atlassian.com/software/confluence"
    } as IContemporary,
    [Contemporary.Qatalog]: {
      label: Contemporary.Qatalog,
      url: "https://qatalog.com/"
    } as IContemporary,
    [Contemporary.WeavaHighlighter]: {
      label: Contemporary.WeavaHighlighter,
      url: "https://www.weavatools.com/"
    } as IContemporary,
    [Contemporary.Vivasnote]: {
      label: Contemporary.Vivasnote,
      url: "https://vivasnote.com/"
    } as IContemporary,
    [Contemporary.Lazy]: {
      label: Contemporary.Lazy,
      url: "https://lazy.so"
    } as IContemporary,
    [Contemporary.Dynalist]: {
      label: Contemporary.Dynalist,
      url: "https://dynalist.io"
    } as IContemporary,
    [Contemporary.Ideaflow]: {
      label: Contemporary.Ideaflow,
      url: "https://ideaflow.io"
    } as IContemporary,
    [Contemporary.Fabric]: {
      label: Contemporary.Fabric,
      url: ""
    } as IContemporary,
    [Contemporary.Affine]: {
      label: Contemporary.Affine,
      url: "https://affine.pro",
      price: 0,
      sourcingType: "AVAILABLE"
    } as IContemporary,
    [Contemporary.ClickupDocs]: {
      label: Contemporary.ClickupDocs,
      url: ""
    } as IContemporary,
    [Contemporary.Gitbook]: {
      label: Contemporary.Gitbook,
      url: ""
    } as IContemporary,
    [Contemporary.Pocket]: {
      label: Contemporary.Pocket,
      url: ""
    } as IContemporary,
    [Contemporary.Miro]: { label: Contemporary.Miro, url: "" } as IContemporary,
    [Contemporary.InfinityMaps]: {
      label: Contemporary.InfinityMaps,
      url: ""
    } as IContemporary
  };

  // Return the default data or a basic fallback
  return (
    defaults[contemporary] ||
    ({
      label: contemporary,
      url: ""
    } as IContemporary)
  );
}

/**
 * Get contemporary data by Contemporary enum
 */
export function getContemporary(contemporary: Contemporary): IContemporary {
  if (jsonDataMap[contemporary]) {
    return jsonDataMap[contemporary]!;
  }
  return getDefaultContemporaryData(contemporary);
}

/**
 * Load contemporary data for a list of contemporaries
 */
export function getContemporaries(
  contemporaryLabels: Contemporary[]
): IContemporary[] {
  if (contemporaryLabels.length > 0) {
    return contemporaryLabels.map((label) => getContemporary(label));
  }
  const allContemporaries = Object.values(Contemporary);
  return allContemporaries.map((contemporary) => getContemporary(contemporary));
}

/**
 * Get feature rating for a specific contemporary and feature slug
 */
export function getContemporaryFeatureRating(
  contemporary: Contemporary,
  featureSlug: string
): { value: number; notes?: string } | null {
  const contemporaryData = getContemporary(contemporary);
  const feature = contemporaryData.features?.find(
    (f) => f.feature === featureSlug
  );

  if (feature) {
    return {
      value: feature.rating,
      notes: feature.notes
    };
  }

  return null;
}

/**
 * Get all contemporaries that have ratings for a specific feature slug
 */
export function getContemporariesForFeature(
  featureSlug: string,
  contemporaryLabels: Contemporary[] = []
): Array<{ label: Contemporary; value: number; notes?: string }> {
  const allContemporaries = getContemporaries(contemporaryLabels);
  const result: Array<{ label: Contemporary; value: number; notes?: string }> =
    [];

  allContemporaries.forEach((contemporary) => {
    const feature = contemporary.features?.find(
      (f) => f.feature === featureSlug
    );
    if (feature) {
      result.push({
        label: contemporary.label,
        value: feature.rating,
        notes: feature.notes
      });
    }
  });

  return result;
}
