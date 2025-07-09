import {
  SourcingType,
  type IContemporary,
  type IFeatureWheelGroup,
  type IFwCategory,
  type IFwFeature
} from "$lib/client/types/featureWheel.type";
import { Contemporary } from "$lib/client/components/featureWheel/comparer.type";

enum MemotronFeatureCategory {
  App = "App",
  Content = "Content",
  Capture = "Capture",
  Clipping = "Clipping",
  Curation = "Curation",
  Views = "Views",
  /**
   * @deprecated - use other categories instead
   */
  Taco = "AI",
  RetrievalAndSynthesis = "Synthesis"
}

export const categories: IFwCategory[] = [
  { label: MemotronFeatureCategory.Capture, color: "#2A8CAB" },
  { label: MemotronFeatureCategory.Clipping, color: "#4E9973" },
  { label: MemotronFeatureCategory.Content, color: "#1E9B92" },
  { label: MemotronFeatureCategory.Curation, color: "#D4A534" },
  { label: MemotronFeatureCategory.RetrievalAndSynthesis, color: "#7E49A1" },
  { label: MemotronFeatureCategory.Views, color: "#AA6A6A" },
  { label: MemotronFeatureCategory.App, color: "#4287f5" }
];

export const contemporaries: IContemporary[] = [
  {
    label: Contemporary.Obsidian,
    url: "https://obsidian.md",
    price: 4,
    sourcingType: SourcingType.PARTIAL,
    faqs: [
      {
        title: "Does Memotron has equivalent of relation property?",
        body: "Memotron doesn't have a relation property. But this is intentional. As per the design of the app where relationships between nodes is required, you can use link tags instead."
      }
    ]
  },
  {
    label: Contemporary.Notion,
    url: "https://notion.so",
    price: 10,
    sourcingType: SourcingType.CLOSED,
    faqs: [
      {
        title: "Does Memotron has equivalent of relation property?",
        body: "Memotron doesn't have a relation property. But this is intentional. As per the design of the app where relationships between nodes is required, you can use link tags instead."
      }
    ],
    switchFromDocumentation:
      "https://docs.memotron.app/memotron/switch-from-other-tools/notion",
    whenToChoose: [
      {
        label: "Team collaboration and sharing"
      },
      {
        label: "Enterprise features"
      },
      {
        label:
          "If you don't mind spending extra time on setup and maintenance or spending extra money buying Notion templates from the community."
      }
    ]
  },
  {
    label: Contemporary.Capacities,
    url: "https://capacities.io",
    price: 10,
    sourcingType: SourcingType.CLOSED,
    whenToChoose: [
      {
        label: "Need stronger AI assistant capabilities for content generation"
      },
      {
        label: "Require end-to-end encryption for sensitive data"
      },
      {
        label: "Want more mature block-based editing system"
      },
      {
        label: "Need better Linux support and cross-platform consistency"
      }
    ]
  },
  {
    label: Contemporary.Evernote,
    url: "https://evernote.com",
    price: 10,
    sourcingType: SourcingType.CLOSED,
    whenToChoose: [
      {
        label: "Need team collaboration and sharing features"
      },
      {
        label: "Want mature web clipper with broad website support"
      },
      {
        label: "Require enterprise-grade admin controls and user management"
      },
      {
        label: "Need established ecosystem with many third-party integrations"
      }
    ]
  },
  {
    label: Contemporary.Logseq,
    url: "https://logseq.com",
    price: 0,
    sourcingType: SourcingType.OPEN,
    whenToChoose: [
      {
        label: "Require fully open-source solution with code transparency"
      },
      {
        label: "Want complete local data control and privacy"
      },
      {
        label: "Need extensive customization through plugins and themes"
      },
      {
        label: "Prefer developer-friendly markdown-based workflow"
      }
    ]
  },
  {
    label: Contemporary.Anytype,
    url: "https://anytype.io",
    sourcingType: SourcingType.SOURCE_AVAILABLE
  },
  {
    label: Contemporary.Roam,
    url: "https://roamresearch.com",
    price: 15,
    sourcingType: SourcingType.CLOSED,
    whenToChoose: [
      {
        label: "Academic research requiring deep interconnected note networks"
      },
      {
        label: "Need more advanced graph visualization and navigation"
      },
      {
        label: "Want block-level references and granular linking"
      },
      {
        label: "Prefer daily notes workflow over our node-based approach"
      }
    ]
  },
  {
    label: Contemporary.Remnote,
    url: "https://www.remnote.com",
    price: 10,
    sourcingType: SourcingType.CLOSED,
    whenToChoose: [
      {
        label: "Need integrated flashcards and spaced repetition for learning"
      },
      {
        label: "Want automatic flashcard generation from notes"
      },
      {
        label: "Studying or academic work is primary use case"
      },
      {
        label: "Need better PDF annotation and study workflows"
      }
    ]
  },
  {
    label: Contemporary.Craft,
    url: "https://www.craft.do",
    price: 10,
    sourcingType: SourcingType.CLOSED,
    whenToChoose: [
      {
        label: "Prioritize beautiful UI and aesthetic design over functionality"
      },
      {
        label: "Want deeper integration with Apple ecosystem"
      },
      {
        label: "Need simpler, more streamlined note-taking experience"
      },
      {
        label: "Prefer document-style notes over our node-based approach"
      }
    ]
  },
  {
    label: Contemporary.Heptabase,
    url: "https://heptabase.com",
    price: 8.99,
    sourcingType: SourcingType.CLOSED,
    whenToChoose: [
      {
        label: "Need visual thinking with whiteboards and mind maps"
      },
      {
        label: "Want spatial organization of ideas on infinite canvas"
      },
      {
        label: "Require advanced PDF annotation and research workflows"
      },
      {
        label: "Need better audio/video transcription capabilities"
      }
    ]
  },
  {
    label: Contemporary.Affine,
    url: "https://affine.pro",
    price: 0,
    sourcingType: SourcingType.SOURCE_AVAILABLE,
    whenToChoose: [
      {
        label: "Need all-in-one workspace with docs, whiteboards, and databases"
      },
      {
        label: "Want self-hosting and complete data ownership"
      },
      {
        label: "Prefer block-based editing similar to Notion"
      },
      {
        label: "Need stronger offline capabilities and local-first approach"
      }
    ]
  },
  {
    label: Contemporary.Tana,
    url: "https://tana.inc",
    price: 15,
    sourcingType: SourcingType.CLOSED,
    whenToChoose: [
      {
        label: "Need advanced AI agents and automation workflows"
      },
      {
        label: "Want voice-first note-taking and meeting transcription"
      },
      {
        label: "Require enterprise-grade collaboration and permissions"
      },
      {
        label: "Need more sophisticated database and query capabilities"
      }
    ]
  },
  {
    label: Contemporary.TheBrain,
    url: ""
  },
  {
    label: Contemporary.Supernotes,
    url: ""
  },
  {
    label: Contemporary.Walling,
    url: ""
  },
  {
    label: Contemporary.Mem,
    url: "https://get.mem.ai",
    price: 0,
    sourcingType: SourcingType.CLOSED,
    whenToChoose: [
      {
        label:
          "Want AI to automatically organize notes without manual structure"
      },
      {
        label: "Prefer minimal interface with no folders or tags"
      },
      {
        label: "Need conversational AI chat interface for note interaction"
      },
      {
        label: "Want to avoid manual organization and curation entirely"
      }
    ]
  },
  {
    label: Contemporary.XMind,
    url: ""
  },
  {
    label: Contemporary.Readwise,
    url: "https://readwise.io",
    price: 9.99,
    sourcingType: SourcingType.CLOSED,
    whenToChoose: [
      {
        label: "Primary use case is reading and highlighting books/articles"
      },
      {
        label: "Need comprehensive import from Kindle, Instapaper, Pocket"
      },
      {
        label: "Want spaced repetition and daily review workflows"
      },
      {
        label: "Prefer specialized reading app over general note-taking"
      }
    ]
  },
  {
    label: Contemporary.Mymind,
    url: ""
  },
  {
    label: Contemporary.Pocket,
    url: ""
  },
  {
    label: Contemporary.Instapaper,
    url: ""
  },
  {
    label: Contemporary.Raindrop,
    url: ""
  },
  {
    label: Contemporary.Liner,
    url: ""
  },
  {
    label: Contemporary.AudioPen,
    url: ""
  },
  {
    label: Contemporary.ViennaScribe,
    icon: "viennascribe",
    url: ""
  },
  {
    label: Contemporary.MilaNote,
    url: ""
  },
  {
    label: Contemporary.Noted,
    url: ""
  },
  {
    label: Contemporary.Bear,
    url: ""
  },
  {
    label: Contemporary.Scrivener,
    url: ""
  },
  {
    label: Contemporary.Ulysses,
    url: ""
  },
  {
    label: Contemporary.Drafts,
    url: ""
  },
  {
    label: Contemporary.AppFlowy,
    url: ""
  },
  {
    label: Contemporary.Scrintal,
    url: ""
  },
  {
    label: Contemporary.Scapple,
    url: ""
  },
  {
    label: Contemporary.Scriv,
    url: ""
  },
  {
    label: Contemporary.Dynalist,
    url: "https://dynalist.io"
  },
  {
    label: Contemporary.Ideaflow,
    url: "https://ideaflow.io"
  },
  {
    label: Contemporary.Fabric,
    url: ""
  },
  {
    label: Contemporary.AppleNotes,
    url: "https://www.icloud.com/notes",
    price: 0,
    sourcingType: SourcingType.CLOSED,
    whenToChoose: [
      {
        label: "Want maximum simplicity with basic note-taking only"
      },
      {
        label: "Exclusively use Apple devices and want native integration"
      },
      {
        label: "Need drawing and handwriting with Apple Pencil"
      },
      {
        label: "Prefer free solution without subscription complexity"
      }
    ]
  },
  {
    label: Contemporary.OneNote,
    url: ""
  },
  {
    label: Contemporary.Voicenotes,
    url: "https://voicenotes.com/"
  },
  {
    label: Contemporary.Milanote,
    url: "https://milanote.com/"
  },
  {
    label: Contemporary.Pinterest,
    url: "https://pinterest.com"
  },
  {
    label: Contemporary.Effie,
    url: "https://www.effie.pro/"
  },
  {
    label: Contemporary.ZohoNotebook,
    url: "https://notebook.zoho.com"
  },
  {
    label: Contemporary.Karakeep,
    url: "https://karakeep.app/"
  },
  {
    label: Contemporary.Kortex,
    url: "https://kortex.co"
  },
  {
    label: Contemporary.Noteey,
    url: "https://noteey.cn/"
  },
  {
    label: Contemporary.SaveDay,
    url: "https://www.save.day/"
  },
  {
    label: Contemporary.Stacks,
    url: "https://betterstacks.com/"
  },
  {
    label: Contemporary.DetaSurf,
    url: "https://deta.surf"
  },
  {
    label: Contemporary.QwikNotes,
    url: "https://qwiknotes.com/"
  },
  {
    label: Contemporary.Fablehenge,
    url: "https://www.fablehenge.com/"
  },
  {
    label: Contemporary.Glasp,
    url: "https://glasp.co/"
  },
  {
    label: Contemporary.SuperMemory,
    url: "https://supermemory.ai/"
  },
  {
    label: Contemporary.MyLifeNote,
    url: "https://mylifenote.ai/"
  },
  {
    label: Contemporary.OpenNotas,
    url: "https://opennotas.io/"
  },
  {
    label: Contemporary.Otio,
    url: "https://otio.ai"
  },
  {
    label: Contemporary.MicroBlog,
    url: "https://micro.blog/"
  },
  {
    label: Contemporary.CoolStuff,
    url: "https://coolstuff.app/"
  },
  {
    label: Contemporary.ThinkMachine,
    url: "https://thinkmachine.com/"
  },
  {
    label: Contemporary.BetterDictation,
    url: "https://betterdictation.com/"
  },
  {
    label: Contemporary.Outline,
    url: "https://www.outline.app/"
  },
  {
    label: Contemporary.AmpleNote,
    url: "https://www.amplenote.com/"
  },
  {
    label: Contemporary.Memex,
    url: "https://memex.garden/"
  },
  {
    label: Contemporary.OneWriter,
    url: ""
  },
  {
    label: Contemporary.IAWriter,
    url: ""
  },
  {
    label: Contemporary.Zettlr,
    url: "https://zettlr.com/"
  },
  {
    label: Contemporary.TheArchive,
    url: "https://zettelkasten.de/"
  },
  {
    label: Contemporary.Trickle,
    url: "https://www.trickle.so/"
  },
  {
    label: Contemporary.Emberly,
    url: "https://ember.ly/"
  },
  {
    label: Contemporary.Saga,
    url: "https://saga.so/"
  },
  {
    label: Contemporary.Strut,
    url: "https://strut.so/"
  },
  {
    label: Contemporary.HeyMind,
    url: "https://heymind.co/"
  },
  {
    label: Contemporary.Beloga,
    url: "https://www.beloga.xyz/"
  },
  {
    label: Contemporary.Joplin,
    url: "https://joplinapp.org/"
  },
  {
    label: Contemporary.WeTransferCollect,
    url: ""
  },
  {
    label: Contemporary.Noteledge,
    url: "https://www.kdanmobile.com/noteledge"
  },
  {
    label: Contemporary.RedNotebook,
    url: "https://rednotebook.app/"
  },
  {
    label: Contemporary.Slite,
    url: "https://slite.com/"
  },
  {
    label: Contemporary.StandardNotes,
    url: "https://standardnotes.com/features"
  },
  {
    label: Contemporary.Trilium,
    url: "https://github.com/zadam/trilium"
  },
  {
    label: Contemporary.Typora,
    url: "https://typora.io/"
  },
  {
    label: Contemporary.Hypothes,
    url: "https://web.hypothes.is/"
  },
  {
    label: Contemporary.Dendron,
    url: "https://www.dendron.so/"
  },
  {
    label: Contemporary.DEVONThink,
    url: "https://www.devontechnologies.com/apps/devonthink"
  },
  {
    label: Contemporary.Mendeley,
    url: ""
  },
  {
    label: Contemporary.MarginNotes,
    url: ""
  },
  {
    label: Contemporary.Reflect,
    url: "https://reflect.app"
  },
  {
    label: Contemporary.GoogleKeep,
    url: ""
  },
  {
    label: Contemporary.Noto,
    url: ""
  },
  {
    label: Contemporary.Flow,
    url: ""
  },
  {
    label: Contemporary.Concepts,
    url: ""
  },
  {
    label: Contemporary.Confluence,
    url: "https://www.atlassian.com/software/confluence"
  },
  {
    label: Contemporary.Qatalog,
    url: "https://qatalog.com/"
  },
  {
    label: Contemporary.WeavaHighlighter,
    url: "https://www.weavatools.com/"
  },
  {
    label: Contemporary.Vivasnote,
    url: "https://vivasnote.com/"
  },
  {
    label: Contemporary.Lazy,
    url: "https://lazy.so"
  }
];

export const features: IFwFeature[] = [
  // App features
  {
    label: "Source",
    category: MemotronFeatureCategory.App,
    image: "/phone.png",
    learnMoreLink: "https://docs.memotron.app/memotron/source",
    progress: 1,
    isProminent: true,
    description:
      "Source available codebase allowing public access and contributions with transparent development process",
    ratingCriteria: [
      {
        label: "Open source or source code is available",
        icon: "ph:code-light"
      },
      {
        label: "Contributions from community are welcome",
        icon: "ph:sparkle-light"
      },
      {
        label: "Transparent development process and regular public updates",
        icon: "ph:eye-light"
      }
    ],
    comparisionProperties: ["sourcingType"],
    notes:
      "To start with, Memotron is fully open source. Not just the source code, we have our entire roadmap and development process transparent to the community. We are currently working on improving the workflow for contributing to the app from our open source community.",
    contemporaries: [
      {
        label: Contemporary.Logseq,
        value: 0.8
      },
      {
        label: Contemporary.Anytype,
        value: 0.7,
        notes:
          "Anytype has a novel approach to source availability with their source-available license"
      },
      {
        label: Contemporary.Obsidian,
        value: 0.4,
        notes:
          "While Obsidian itself isn't open source, the plugins built on top of Obsidian are open-source."
      },
      ...contemporaries
        .filter(
          (c) => !c.sourcingType || c.sourcingType === SourcingType.CLOSED
        )
        .map((c) => ({
          label: c.label,
          value: 0
        }))
    ]
  },
  {
    label: "Privacy & ownership",
    shortLabel: "Privacy",
    category: MemotronFeatureCategory.App,
    progress: 0.9,
    description:
      "Alignment with users' values regarding privacy, security, and ownership of their data.",
    notes:
      "User privacy and data ownership is at the core of how we do business. You can learn more about our core principles here: [papers.21n.org/soft](https://papers.21n.org/soft).",
    ratingCriteria: [
      { label: "Offline-first approach" },
      { label: "End-to-end encryption for cloud sync" },
      { label: "Has a bug bounty program" },
      { label: "Does not sell user data for external use by other companies" },
      { label: "Consent for email collection & promotional email" },
      { label: "Lower spam rate for promotional emails" },
      { label: "Consent for anonymous usage data collection" },
      { label: "Zero tolerance for misuse of user data" }
    ],
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.7,
        notes:
          "Obsidian is doing a great job at this. With their offline-first approach, and end-to-end encryption they are definitely a privacy-first app."
      },
      {
        label: Contemporary.Notion,
        value: 0.3,
        notes:
          "Notion doesn't take offline-first approach and does not have end-to-end encryption for cloud sync. Notion does have a [bug bounty program](https://www.notion.so/notion/Responsible-Disclosure-Policy-5f18bb6b86804eaf989c006131778b9c) and [discloses](https://www.notion.so/notion/Privacy-Policy-3468d120cf614d4c9014c09f6adc9091) that it does not sell user data for external use by other companies."
      }
    ]
  },
  {
    label: "Reliability",
    category: MemotronFeatureCategory.App,
    progress: 0.5,
    description:
      "The ability to rely on the app to work as expected without worrying about anything. The *This just works* experience.",
    notes:
      "We are committed to providing extremely reliable app. We are still working on this aspect and will be improving it in the upcoming releases.Thanks for your continued support.",
    ratingCriteria: [
      { label: "Zero day one bugs" },
      { label: "> 99% uptime & transparent status page" },
      { label: "Mission critical performance" },
      { label: "No data loss or corruption" },
      { label: "No crashes or other reliability issues" }
    ],
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.7
      },
      {
        label: Contemporary.Notion,
        value: 0.3,
        notes:
          "While Notion maintains reliability in all other aspects, it has been historically plagued with suboptimal performance especially when dealing with large databases. Notion has a [status page](https://www.notion-status.com/) and the historical uptime stands good at > 99%."
      }
    ]
  },
  {
    label: "Setup & maintenance",
    shortLabel: "Maintenance",
    category: MemotronFeatureCategory.App,
    progress: 0.8,
    description:
      "The ability to set up and maintain the app with minimal friction, time, and effort",
    notes:
      "Setting up Memotron for use is extremely easy as there is almost no setup required. You can start using it right away.",
    ratingCriteria: [
      { label: "Easy installation and first use" },
      { label: "Easy configuration and setup" },
      { label: "Minimal maintenance required" },
      { label: "Minimal friction in usage" }
    ],
    contemporaries: [
      {
        label: Contemporary.Tana,
        value: 0.5
      },
      {
        label: Contemporary.Anytype,
        value: 0.5
      },
      {
        label: Contemporary.Capacities,
        value: 0.7
      },
      {
        label: Contemporary.Heptabase,
        value: 0.3
      },
      {
        label: Contemporary.AppleNotes,
        value: 0.7
      },
      {
        label: Contemporary.Notion,
        value: 0.15,
        notes:
          "By design, Notion requires its users to constantly setup and maintain the workflows inside the app. This consumes a lot of time and effort. While this level of customization might benefit teams or organizations, it is not ideal for individual users."
      },
      {
        label: Contemporary.Obsidian,
        value: 0.05
      }
    ]
  },
  {
    label: "Accessibility",
    category: MemotronFeatureCategory.App,
    progress: 0.5,
    isPlanned: true,
    description:
      "Inclusive design supporting various accessibility needs. We appreciate the thoroughness of Apple's accessibility guidelines. Therefore, we are following them as closely as possible.",
    ratingCriteria: [{ label: "Follow Apple's accessibility guidelines." }],
    contemporaries: []
  },
  {
    label: "Sustainability",
    category: MemotronFeatureCategory.App,
    progress: 0.5,
    description:
      "Viable long-term business model ensuring the app's continued existence along with strong controls on data resuse.",
    notes:
      "We are not here to exit. We are here to last. Read our entire philosophy here: [papers.21n.org/soft](https://papers.21n.org/soft). While our code is open-source, we are still working on self-hosting and interoperability with other apps.",
    ratingCriteria: [
      { label: "Viable long-term business model" },
      {
        label:
          "Ability to self-host on user's private cloud. (Note: this is different from the available of full offline version of the app)"
      },
      {
        label:
          "Interoperability with other apps - Integration with other apps and services through APIs, plugins, and robust import/export capabilities"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.8
      },
      {
        label: Contemporary.Notion,
        value: 0.5,
        notes:
          "Notion does not have a way to self-host on user's private cloud and it does not have full offline support to enable user's manual backups. Notion does provide an [API](https://developers.notion.com/) for integration with other apps and a robust [export feature](https://www.notion.com/help/export-your-content) which exports all the workspace content. On funding and financials, Notion is subject to closure or acquisition by other companies due to its [funding model](https://www.reddit.com/r/Notion/comments/q4c8wf/notion_raised_275m_in_new_capital_and_reaches_10/)."
      }
    ]
  },
  {
    label: "Offlinability",
    category: MemotronFeatureCategory.App,
    progress: 0.9,
    description:
      "Fully functional offline version with local-first data storage and synchronization when online if user opts for it.",
    ratingCriteria: [
      { label: "Fully functional offline version" },
      { label: "Local-first data storage" },
      { label: "Synchronization when online" }
    ],
    contemporaries: [
      {
        label: Contemporary.Capacities,
        value: 0.8
      },
      {
        label: Contemporary.Notion,
        value: 0.25,
        notes: "Notion has very limited support for offline-use."
      },
      {
        label: Contemporary.Logseq,
        value: 1.0
      },
      {
        label: Contemporary.Anytype,
        value: 1.0
      },
      {
        label: Contemporary.Remnote,
        value: 1.0
      },
      {
        label: Contemporary.Tana,
        value: 0.5
      },
      {
        label: Contemporary.Roam,
        value: 0.5
      },
      {
        label: Contemporary.Affine,
        value: 1.0
      },
      {
        label: Contemporary.Heptabase,
        value: 1.0
      },
      {
        label: Contemporary.Craft,
        value: 1.0
      },
      {
        label: Contemporary.Mem,
        value: 1.0
      },
      {
        label: Contemporary.AppleNotes,
        value: 1.0
      }
    ]
  },
  {
    label: "Agent mode",
    category: MemotronFeatureCategory.App,
    progress: 0,
    isPlanned: true,
    isNovel: true,
    description:
      "Voice commands and dictation for hands-free interaction with your knowledge base",
    contemporaries: []
  },

  // Content features
  {
    label: "Basic markdown",
    category: MemotronFeatureCategory.Content,
    progress: 0.75,
    isProminent: true,
    description:
      "Support for standard Markdown syntax for rich text formatting and structuring. Note: This doesn't include advanced features like embeds, tables, etc.",
    ratingCriteria: [
      {
        label: "Support for markdown syntax to create and alter blocks"
      },
      {
        label: "Support for inline formatting using escape shortcuts"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.8
      },
      {
        label: Contemporary.Notion,
        value: 0.8
      },
      {
        label: Contemporary.Capacities,
        value: 0.8
      },
      {
        label: Contemporary.Heptabase,
        value: 0.8
      },
      {
        label: Contemporary.Roam,
        value: 0.8
      },
      {
        label: Contemporary.Tana,
        value: 0.8
      },
      {
        label: Contemporary.Anytype,
        value: 0.8
      },
      {
        label: Contemporary.Remnote,
        value: 0.8
      },
      {
        label: Contemporary.Bear,
        value: 0.8
      },
      {
        label: Contemporary.Heptabase,
        value: 0.8
      },
      {
        label: Contemporary.Mymind,
        value: 0.8
      },
      {
        label: Contemporary.Evernote,
        value: 0.8
      },
      {
        label: Contemporary.Logseq,
        value: 0.8
      },
      {
        label: Contemporary.Affine,
        value: 0.8
      },
      {
        label: Contemporary.Craft,
        value: 0.8
      },
      {
        label: Contemporary.Mem,
        value: 0.8
      }
    ]
  },
  {
    label: "Advanced Md",
    category: MemotronFeatureCategory.Content,
    progress: 0.3,
    isPlanned: true,
    isNovel: true,
    description:
      "Extended Markdown features including custom blocks, embeds, and interactive elements",
    ratingCriteria: [
      {
        label: "Support for layout blocks like tables"
      },
      {
        label: "Support for embeds"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Notion,
        value: 0.8
      },
      {
        label: Contemporary.Capacities,
        value: 0.8
      },
      {
        label: Contemporary.Evernote,
        value: 0.2
      },
      {
        label: Contemporary.Logseq,
        value: 0.6
      },
      {
        label: Contemporary.Anytype,
        value: 0.8
      },
      {
        label: Contemporary.Remnote,
        value: 0.8
      },
      {
        label: Contemporary.Tana,
        value: 0.2
      },
      {
        label: Contemporary.Roam,
        value: 0.8
      },
      {
        label: Contemporary.Affine,
        value: 0.8
      },
      {
        label: Contemporary.Heptabase,
        value: 0.8
      },
      {
        label: Contemporary.Craft,
        value: 0.2
      },
      {
        label: Contemporary.Mem,
        value: 0.6
      }
    ]
  },
  {
    label: "Pdf",
    category: MemotronFeatureCategory.Content,
    progress: 0.8,
    description: "Native PDF viewing, and annotation capabilities",
    ratingCriteria: [
      {
        label: "Native PDF viewing"
      },
      {
        label: "Annotation capabilities"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Remnote,
        value: 0.8
      },
      {
        label: Contemporary.Capacities,
        value: 0.6
      },
      {
        label: Contemporary.Evernote,
        value: 0.6
      },
      {
        label: Contemporary.Logseq,
        value: 0.8
      },
      {
        label: Contemporary.Anytype,
        value: 0.6
      },
      {
        label: Contemporary.Readwise,
        value: 0.8
      },
      {
        label: Contemporary.Tana,
        value: 0.6
      },
      {
        label: Contemporary.Roam,
        value: 0.6
      },
      {
        label: Contemporary.Affine,
        value: 0.8
      },
      {
        label: Contemporary.Heptabase,
        value: 0.8
      },
      {
        label: Contemporary.Craft,
        value: 0.2
      },
      {
        label: Contemporary.Mem,
        value: 0.2
      },
      {
        label: Contemporary.AppleNotes,
        value: 0.6
      }
    ]
  },
  {
    label: "Audio",
    category: MemotronFeatureCategory.Content,
    progress: 0.75,
    description:
      "Audio file support with playback and transcription capabilities.",
    ratingCriteria: [
      {
        label: "Native audio playback"
      },
      {
        label: "Transcription capabilities"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.AudioPen,
        value: 0.8
      },
      {
        label: Contemporary.ViennaScribe,
        value: 0.5
      },
      {
        label: Contemporary.Noted,
        value: 0.7
      },
      {
        label: Contemporary.Capacities,
        value: 0.6
      },
      {
        label: Contemporary.Evernote,
        value: 0.6
      },
      {
        label: Contemporary.Logseq,
        value: 0.6
      },
      {
        label: Contemporary.Anytype,
        value: 0.6
      },
      {
        label: Contemporary.Tana,
        value: 0.6
      },
      {
        label: Contemporary.Roam,
        value: 0.6
      },
      {
        label: Contemporary.Affine,
        value: 0.8
      },
      {
        label: Contemporary.Heptabase,
        value: 0.6
      },
      {
        label: Contemporary.Craft,
        value: 0.2
      },
      {
        label: Contemporary.Mem,
        value: 0.2
      },
      {
        label: Contemporary.AppleNotes,
        value: 0.6
      }
    ]
  },
  {
    label: "AI editing and processing",
    category: MemotronFeatureCategory.Content,
    progress: 0.7,
    isPlanned: true,
    description:
      "AI assisted content creation and ideation with state-of-the-art language models",
    contemporaries: [
      {
        label: Contemporary.Notion,
        value: 0.5
      },
      {
        label: Contemporary.Capacities,
        value: 0.5
      },
      {
        label: Contemporary.Heptabase,
        value: 0.5
      },
      {
        label: Contemporary.Tana,
        value: 0.5
      },
      {
        label: Contemporary.Anytype,
        value: 0.5
      },
      {
        label: Contemporary.Evernote,
        value: 0.8
      },
      {
        label: Contemporary.Logseq,
        value: 0.2
      },
      {
        label: Contemporary.Remnote,
        value: 0.8
      },
      {
        label: Contemporary.Roam,
        value: 0.2
      },
      {
        label: Contemporary.Affine,
        value: 0.8
      },
      {
        label: Contemporary.Craft,
        value: 0.6
      },
      {
        label: Contemporary.Mem,
        value: 0.6
      }
    ]
  },
  {
    label: "Version control",
    category: MemotronFeatureCategory.Content,
    progress: 0,
    isPlanned: true,
    description:
      "Ability to track and visualize the evolution of content over time",
    ratingCriteria: [
      {
        label: "Ability to see history"
      },
      {
        label: "Ability to mark versions in history, rollback, duplicate etc"
      },
      {
        label: "Ability to fork content and have variants of content"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Notion,
        value: 0.7
      },
      {
        label: Contemporary.Capacities,
        value: 0.7
      },
      {
        label: Contemporary.Evernote,
        value: 0.8
      },
      {
        label: Contemporary.Logseq,
        value: 0.6
      },
      {
        label: Contemporary.Anytype,
        value: 0.8
      },
      {
        label: Contemporary.Tana,
        value: 0.2
      },
      {
        label: Contemporary.Affine,
        value: 0.8
      },
      {
        label: Contemporary.Heptabase,
        value: 0.8
      },
      {
        label: Contemporary.Craft,
        value: 0.6
      },
      {
        label: Contemporary.Mem,
        value: 0.6
      }
    ]
  },
  {
    label: "Comments",
    category: MemotronFeatureCategory.Content,
    progress: 0,
    isPlanned: true,
    description: "Ability to comment on content",
    ratingCriteria: [
      {
        label: "Ability to comment on content"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Notion,
        value: 0.7
      },
      {
        label: Contemporary.Capacities,
        value: 0.7
      }
    ]
  },
  {
    label: "Metadata",
    category: MemotronFeatureCategory.Content,
    progress: 0,
    isPlanned: true,
    description:
      "Rich metadata support for content organization, tagging, and property-based filtering",
    ratingCriteria: [
      {
        label:
          "Rich metadata especially for media nodes like images, audio, etc"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Notion,
        value: 0.4
      },
      {
        label: Contemporary.Capacities,
        value: 0.4
      },
      {
        label: Contemporary.Evernote,
        value: 0.8
      },
      {
        label: Contemporary.Logseq,
        value: 0.6
      },
      {
        label: Contemporary.Anytype,
        value: 0.2
      },
      {
        label: Contemporary.Remnote,
        value: 0.2
      },
      {
        label: Contemporary.Readwise,
        value: 0.6
      },
      {
        label: Contemporary.Tana,
        value: 0.6
      },
      {
        label: Contemporary.Roam,
        value: 0.6
      },
      {
        label: Contemporary.Affine,
        value: 0.8
      },
      {
        label: Contemporary.Heptabase,
        value: 0.6
      },
      {
        label: Contemporary.Craft,
        value: 0.8
      },
      {
        label: Contemporary.Mem,
        value: 0.6
      },
      {
        label: Contemporary.AppleNotes,
        value: 0.2
      }
    ]
  },

  // Capture features
  {
    label: "Seamless capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.4,
    isHideForComparer: true,
    description:
      "Quick and frictionless information capture from any context and device.",
    contemporaries: []
  },
  {
    label: "Text capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.8,
    description: "Ability to quickly capture text.",
    ratingCriteria: [
      {
        label: "Quick and frictionless"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.8
      },
      {
        label: Contemporary.Notion,
        value: 0.8
      },
      {
        label: Contemporary.Capacities,
        value: 0.6,
        notes:
          "Text and camera capture can be done with one click on mobile, but not on desktop"
      },
      {
        label: Contemporary.Evernote,
        value: 0.6,
        notes: "Single-click capture only on mobile, limited on desktop and web"
      },
      {
        label: Contemporary.Logseq,
        value: 0.6
      },
      {
        label: Contemporary.Anytype,
        value: 0.8
      },
      {
        label: Contemporary.Remnote,
        value: 0.8
      },
      {
        label: Contemporary.Tana,
        value: 0.6
      },
      {
        label: Contemporary.Roam,
        value: 0.6
      },
      {
        label: Contemporary.Affine,
        value: 0.6
      },
      {
        label: Contemporary.Heptabase,
        value: 0.8
      },
      {
        label: Contemporary.Craft,
        value: 0.8
      },
      {
        label: Contemporary.Mem,
        value: 0.8
      },
      {
        label: Contemporary.AppleNotes,
        value: 0.8
      }
    ]
  },
  {
    label: "Camera capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.8,
    description:
      "Ability to quickly capture image or video using the camera of the device.",
    ratingCriteria: [
      {
        label:
          "Quick and frictionless - as seamless as using Instagram or other photo based social platforms"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Capacities,
        value: 0.6
      },
      {
        label: Contemporary.Evernote,
        value: 0.6
      },
      {
        label: Contemporary.Logseq,
        value: 0.6
      },
      {
        label: Contemporary.Anytype,
        value: 0.6,
        notes:
          "Doesn't have built-in camera or native recorder, only supports uploading existing files"
      },
      {
        label: Contemporary.Remnote,
        value: 0.6,
        notes: "Takes more than two interactions to capture properly"
      },
      {
        label: Contemporary.Readwise,
        value: 0.6,
        notes:
          "Camera capture allows users to capture highlights from physical books using phone's camera (OCR)"
      },
      {
        label: Contemporary.Tana,
        value: 0.6
      },
      {
        label: Contemporary.Roam,
        value: 0.6
      },
      {
        label: Contemporary.Affine,
        value: 0.6
      },
      {
        label: Contemporary.Heptabase,
        value: 0.8
      },
      {
        label: Contemporary.AppleNotes,
        value: 0.6
      }
    ]
  },
  {
    label: "Audio capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.8,
    description: "Ability to quickly capture information using voice recording",
    ratingCriteria: [
      {
        label: "Quick and frictionless"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Capacities,
        value: 0.6
      },
      {
        label: Contemporary.Evernote,
        value: 0.6
      },
      {
        label: Contemporary.Logseq,
        value: 0.6
      },
      {
        label: Contemporary.Anytype,
        value: 0.6
      },
      {
        label: Contemporary.Remnote,
        value: 0.6
      },
      {
        label: Contemporary.Tana,
        value: 0.6
      },
      {
        label: Contemporary.Roam,
        value: 0.6
      },
      {
        label: Contemporary.Affine,
        value: 0.6
      },
      {
        label: Contemporary.Heptabase,
        value: 0.6
      },
      {
        label: Contemporary.AppleNotes,
        value: 0.6
      }
    ]
  },
  {
    label: "Type capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.8,
    isNovel: true,
    description:
      "Capturing new information using types which enables capturing of properties, adding to the collection while capturing.",
    ratingCriteria: [
      {
        label: "Quick and frictionless"
      },
      {
        label: "Ability to capture properties of various types"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Capacities,
        value: 0.6
      },
      {
        label: Contemporary.Anytype,
        value: 0.8
      },
      {
        label: Contemporary.Remnote,
        value: 0.2
      },
      {
        label: Contemporary.Affine,
        value: 0.6
      },
      {
        label: Contemporary.Heptabase,
        value: 0.6
      }
    ]
  },
  {
    label: "Sketch capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0,
    isPlanned: true,
    description:
      "Ability to quickly capture thoughts or ideas using sketching.",
    contemporaries: []
  },

  // Clipping features
  {
    label: "Clip from web",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.8,
    description:
      "Web content clipping with browser extensions and mobile apps for saving articles and pages",
    ratingCriteria: [
      {
        label: "Quick and frictionless saving of any web page"
      },
      {
        label: "Ability to highlight and save text from any web page"
      },
      {
        label:
          "Ability to have text highlights persisted on the web page when returning to the page"
      },
      {
        label:
          "Ability to view all the highlights made on a web page and the ability to scroll to that part of the page upon clicking"
      },
      {
        label: "Ability to screenshot on a web page"
      },
      {
        label:
          "Ability to add additional notes to the web page or the highlights"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.4
      },
      {
        label: Contemporary.Notion,
        value: 0.4
      },
      {
        label: Contemporary.Capacities,
        value: 0.4
      },
      {
        label: Contemporary.Remnote,
        value: 0.4
      },
      {
        label: Contemporary.Mymind,
        value: 0.7
      },
      {
        label: Contemporary.Pocket,
        value: 0.7
      },
      {
        label: Contemporary.Instapaper,
        value: 0.7
      },
      {
        label: Contemporary.Raindrop,
        value: 0.7
      },
      {
        label: Contemporary.Liner,
        value: 0.8
      },
      {
        label: Contemporary.Evernote,
        value: 0.6
      },
      {
        label: Contemporary.Logseq,
        value: 0.6
      },
      {
        label: Contemporary.Anytype,
        value: 0.6
      },
      {
        label: Contemporary.Readwise,
        value: 0.6
      },
      {
        label: Contemporary.Roam,
        value: 0.8
      },
      {
        label: Contemporary.Affine,
        value: 0.6
      },
      {
        label: Contemporary.Heptabase,
        value: 0.6
      }
    ]
  },
  {
    label: "Youtube clipping",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.75,
    description:
      "YouTube video clipping with timestamp marking and transcription capabilities",
    ratingCriteria: [
      {
        label: "Quick and frictionless saving of any YouTube video"
      },
      {
        label: "Ability to highlight points in the video and save them"
      },
      {
        label: "Ability to add additional notes to the video"
      },
      {
        label:
          "Ability to view the list of highlights made on the video and jump to that part of the video upon clicking"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Liner,
        value: 0.3
      },
      {
        label: Contemporary.Evernote,
        value: 0.2,
        notes:
          "Clips webpage of YouTube video with description, not actual video content"
      },
      {
        label: Contemporary.Readwise,
        value: 0.6,
        notes:
          "Captures specific YouTube video page and auto-generates summary of video content"
      }
    ]
  },
  {
    label: "Tweet clipping",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.75,
    description: "Clipping tweets",
    ratingCriteria: [
      {
        label: "Ability to save tweets from Twitter"
      },
      {
        label: "Ability to add additional notes to the tweet"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Readwise,
        value: 0.6
      }
    ]
  },
  {
    label: "Other socials clipping",
    category: MemotronFeatureCategory.Clipping,
    progress: 0,
    isPlanned: true,
    description: "Clipping other social posts like Linkedin, Reddit, etc.",
    contemporaries: [
      {
        label: Contemporary.Readwise,
        value: 0.6
      }
    ]
  },
  {
    label: "Clip from mobile",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.1,
    isPlanned: true,
    description:
      "Mobile-optimized clipping experience for capturing content on smartphones and tablets",
    contemporaries: [
      {
        label: Contemporary.Evernote,
        value: 0.8
      },
      {
        label: Contemporary.Logseq,
        value: 0.6
      },
      {
        label: Contemporary.Anytype,
        value: 0.8
      },
      {
        label: Contemporary.Heptabase,
        value: 0.8
      }
    ]
  },
  {
    label: "Clip from desktop",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.1,
    isPlanned: true,
    description:
      "Desktop screen clipping and snipping tools for capturing any content on your computer when the app is not active",
    contemporaries: []
  },
  {
    label: "Kindle sync",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.8,
    description:
      "Import and organization of Kindle highlights and notes with book metadata",
    ratingCriteria: [
      {
        label: "Ability to import highlights and notes from Kindle"
      },
      {
        label: "Ability to add additional notes to the highlights"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Readwise,
        value: 0.8
      },
      {
        label: Contemporary.Notion,
        value: 0.3
      }
    ]
  },
  {
    label: "Audible highlights",
    category: MemotronFeatureCategory.Clipping,
    progress: 0,
    isPlanned: true,
    description:
      "Import and organization of Audible highlights and notes with audiobook metadata",
    contemporaries: []
  },
  {
    label: "Spotify highlights",
    category: MemotronFeatureCategory.Clipping,
    progress: 0,
    isPlanned: true,
    description:
      "Capture and organization of highlights from podcast and music content on Spotify",
    contemporaries: []
  },

  // Curation features
  {
    label: "Link to curate",
    category: MemotronFeatureCategory.Curation,
    progress: 0.8,
    isNovel: true,
    description:
      "Ability to curate new information at source by simply linking to the the destination of the information",
    contemporaries: [
      {
        label: Contemporary.Anytype,
        value: 0.8
      },
      {
        label: Contemporary.Remnote,
        value: 0.8
      },
      {
        label: Contemporary.Tana,
        value: 0.6
      },
      {
        label: Contemporary.Heptabase,
        value: 0.8
      },
      {
        label: Contemporary.Mem,
        value: 0.6
      }
    ]
  },
  {
    label: "Nodularity",
    category: MemotronFeatureCategory.Curation,
    progress: 0.8,
    isNovel: true,
    description:
      "Ability to associate new information to an exact location in a markdown node i.e. headings and sub headings.",
    contemporaries: [
      {
        label: Contemporary.Logseq,
        value: 0.8
      },
      {
        label: Contemporary.Anytype,
        value: 0.8
      },
      {
        label: Contemporary.Remnote,
        value: 0.8
      },
      {
        label: Contemporary.Tana,
        value: 0.8
      },
      {
        label: Contemporary.Roam,
        value: 0.8
      },
      {
        label: Contemporary.Heptabase,
        value: 0.6
      },
      {
        label: Contemporary.Craft,
        value: 0.6
      }
    ]
  },
  {
    label: "Collections/tags",
    category: MemotronFeatureCategory.Curation,
    progress: 0.8,
    isNovel: true,
    description: "Ability to collect information into simple collections/tags",
    contemporaries: [
      {
        label: Contemporary.Evernote,
        value: 0.2
      },
      {
        label: Contemporary.Logseq,
        value: 0.6
      },
      {
        label: Contemporary.Anytype,
        value: 0.8
      },
      {
        label: Contemporary.Remnote,
        value: 0.8
      },
      {
        label: Contemporary.Tana,
        value: 0.8
      },
      {
        label: Contemporary.Affine,
        value: 0.6
      },
      {
        label: Contemporary.Heptabase,
        value: 0.6
      },
      {
        label: Contemporary.Craft,
        value: 0.6
      },
      {
        label: Contemporary.Mem,
        value: 0.8
      },
      {
        label: Contemporary.AppleNotes,
        value: 0.8
      }
    ]
  },
  {
    label: "Types/Objects",
    category: MemotronFeatureCategory.Curation,
    image: "/clipFeature.png",
    learnMoreLink: "https://docs.memotron.app/memotron/types",
    progress: 0.75,
    description:
      "Structured data with custom avatars, properties, and relations for organized knowledge",
    ratingCriteria: [
      {
        label:
          "Ability to create objects/types with a title, avatar and properties"
      },
      {
        label:
          "Ability to have variety of property types to save and organize information including but not limited to text, number, date, rating, select, checkbox, etc."
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Capacities,
        value: 0.7
      },
      {
        label: Contemporary.Notion,
        value: 0.7
      },
      {
        label: Contemporary.Anytype,
        value: 0.7
      },
      {
        label: Contemporary.Tana,
        value: 0.5
      },
      {
        label: Contemporary.Obsidian,
        value: 0.4
      }
    ]
  },
  {
    label: "Backlinking",
    category: MemotronFeatureCategory.Curation,
    progress: 0.75,
    description:
      "Automatic and manual backlink creation to discover connections between content pieces",
    ratingCriteria: [
      {
        label: "Ability to create and view backlinks to other nodes"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.8
      },
      {
        label: Contemporary.Notion,
        value: 0.8
      },
      {
        label: Contemporary.Capacities,
        value: 0.8
      },
      {
        label: Contemporary.Heptabase,
        value: 0.8
      },
      {
        label: Contemporary.Roam,
        value: 0.8
      },
      {
        label: Contemporary.Tana,
        value: 0.8
      },
      {
        label: Contemporary.Anytype,
        value: 0.8
      },
      {
        label: Contemporary.Remnote,
        value: 0.8
      }
    ]
  },
  {
    label: "Query",
    category: MemotronFeatureCategory.Curation,
    progress: 0,
    isPlanned: true,
    description:
      "Advanced query language for filtering and aggregating content based on properties and content",
    contemporaries: [
      {
        label: Contemporary.Anytype,
        value: 0.8
      }
    ]
  },
  {
    label: "Forelink suggestions",
    category: MemotronFeatureCategory.Curation,
    progress: 0,
    isPlanned: true,
    isNovel: true,
    description:
      "AI-suggested connections between content based on semantic similarity and relationships",
    contemporaries: []
  },

  // Views features
  {
    label: "Calendar",
    category: MemotronFeatureCategory.Views,
    progress: 0.75,
    isNovel: true,
    description:
      "Time-based visualization of content with chronological organization capabilities",
    ratingCriteria: [
      {
        label: "Ability to take notes on a specific date"
      },
      {
        label:
          "Ability to take notes on higher time periods like month, year etc for planning and retrospection purposes"
      },
      {
        label:
          "Ability to view information captured or clipped on taken on a particular day"
      },
      {
        label:
          "Ability to switch between time scales like day, week, month, year to gain better perspective"
      },
      {
        label:
          "Retrospection feature by connecting dots with similar days years ago, high level overview etc"
      }
      // {
      //   label:
      //     "Ability to view time periods like days, weeks, months etc as stacked columns for easy planning"
      // }
      // {
      //   label: "Ability to view heatmap of activity for easier retrospection"
      // }
    ],
    contemporaries: [
      {
        label: Contemporary.Evernote,
        value: 0.6
      },
      {
        label: Contemporary.Logseq,
        value: 0.2
      },
      {
        label: Contemporary.Anytype,
        value: 0.6
      },
      {
        label: Contemporary.Remnote,
        value: 0.2
      },
      {
        label: Contemporary.Roam,
        value: 0.6
      },
      {
        label: Contemporary.Affine,
        value: 0.2
      },
      {
        label: Contemporary.Craft,
        value: 0.6
      },
      {
        label: Contemporary.AppleNotes,
        value: 0.8
      }
    ]
  },
  {
    label: "Graph view",
    category: MemotronFeatureCategory.Views,
    progress: 0.75,
    description: "Graph view for visual organization and workflow management",
    ratingCriteria: [
      {
        label: "Ability to view the entire knowledge base as a graph"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.8
      },
      {
        label: Contemporary.Logseq,
        value: 0.8
      },
      {
        label: Contemporary.Tana,
        value: 0.8
      },
      {
        label: Contemporary.Roam,
        value: 0.6
      }
    ]
  },
  {
    label: "Bird view",
    category: MemotronFeatureCategory.Views,
    progress: 0.75,
    isNovel: true,
    description:
      "High-level overview visualization of your entire knowledge base and its connections",
    ratingCriteria: [
      {
        label:
          "Ability to view entire knowledge base at once using graph or other similar high level views"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.8
      },
      {
        label: Contemporary.Roam,
        value: 0.7
      },
      {
        label: Contemporary.Heptabase,
        value: 0.55
      },
      {
        label: Contemporary.Logseq,
        value: 0.8
      },
      {
        label: Contemporary.Tana,
        value: 0.8
      },
      {
        label: Contemporary.Affine,
        value: 0.8
      }
    ]
  },
  {
    label: "Board view",
    category: MemotronFeatureCategory.Views,
    progress: 0.75,
    description:
      "Kanban-style board view for visual organization and workflow management",
    ratingCriteria: [
      {
        label: "Ability to create and view boards"
      },
      {
        label: "Ability to add cards to the board"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Notion,
        value: 0.8
      },
      {
        label: Contemporary.Anytype,
        value: 0.8
      },
      {
        label: Contemporary.Tana,
        value: 0.8
      },
      {
        label: Contemporary.Affine,
        value: 0.8
      },
      {
        label: Contemporary.Heptabase,
        value: 0.8
      }
    ]
  },
  {
    label: "Table",
    category: MemotronFeatureCategory.Views,
    progress: 0.15,
    isPlanned: true,
    description:
      "Structured table view with sorting, filtering, and customizable columns",
    contemporaries: [
      {
        label: Contemporary.Notion,
        value: 0.7
      },
      {
        label: Contemporary.Anytype,
        value: 0.8
      },
      {
        label: Contemporary.Tana,
        value: 0.8
      },
      {
        label: Contemporary.Affine,
        value: 0.8
      },
      {
        label: Contemporary.Heptabase,
        value: 0.8
      }
    ]
  },
  {
    label: "Combination",
    category: MemotronFeatureCategory.Views,
    progress: 0.15,
    isPlanned: true,
    description:
      "Customizable combination of different view types for flexible information display",
    contemporaries: [
      {
        label: Contemporary.ClickupDocs,
        value: 0.4
      },
      {
        label: Contemporary.Gitbook,
        value: 0.6
      }
    ]
  },

  // Retrieval and synthesis features
  {
    label: "Search",
    category: MemotronFeatureCategory.RetrievalAndSynthesis,
    progress: 0.8,
    description: "Search for content in the knowledge base",
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.8
      },
      {
        label: Contemporary.Notion,
        value: 0.8
      },
      {
        label: Contemporary.Capacities,
        value: 0.8
      },
      {
        label: Contemporary.Evernote,
        value: 0.8
      },
      {
        label: Contemporary.Logseq,
        value: 0.8
      },
      {
        label: Contemporary.Anytype,
        value: 0.8
      },
      {
        label: Contemporary.Remnote,
        value: 0.8
      },
      {
        label: Contemporary.Readwise,
        value: 0.8
      },
      {
        label: Contemporary.Tana,
        value: 0.8
      },
      {
        label: Contemporary.Roam,
        value: 0.8
      },
      {
        label: Contemporary.Affine,
        value: 0.6
      },
      {
        label: Contemporary.Heptabase,
        value: 0.8
      },
      {
        label: Contemporary.Craft,
        value: 0.8
      },
      {
        label: Contemporary.Mem,
        value: 0.8
      },
      {
        label: Contemporary.AppleNotes,
        value: 0.8
      }
    ]
  },
  {
    label: "Semantic search",
    category: MemotronFeatureCategory.RetrievalAndSynthesis,
    progress: 0,
    isPlanned: true,
    description:
      "Concept and meaning-based search powered by advanced embedding models. Natural language search capabilities for finding content using conversational queries",
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.6
      },
      {
        label: Contemporary.Notion,
        value: 0.6
      },
      {
        label: Contemporary.Capacities,
        value: 0.6
      },
      {
        label: Contemporary.Evernote,
        value: 0.2
      },
      {
        label: Contemporary.Remnote,
        value: 0.6
      },
      {
        label: Contemporary.Tana,
        value: 0.6
      },
      {
        label: Contemporary.Affine,
        value: 0.6
      },
      {
        label: Contemporary.Heptabase,
        value: 0.6
      },
      {
        label: Contemporary.Craft,
        value: 0.6
      },
      {
        label: Contemporary.Mem,
        value: 0.2
      },
      {
        label: Contemporary.AppleNotes,
        value: 0.2
      }
    ]
  },
  {
    label: "Summarizer",
    category: MemotronFeatureCategory.RetrievalAndSynthesis,
    progress: 0,
    isPlanned: true,
    isNovel: true,
    description:
      "Automatic generation of summaries for long-form content and collections of notes",
    contemporaries: [
      {
        label: Contemporary.Evernote,
        value: 0.6
      },
      {
        label: Contemporary.Logseq,
        value: 0.8
      },
      {
        label: Contemporary.Readwise,
        value: 0.8
      },
      {
        label: Contemporary.Tana,
        value: 0.8
      },
      {
        label: Contemporary.Affine,
        value: 0.6
      },
      {
        label: Contemporary.Heptabase,
        value: 0.6
      },
      {
        label: Contemporary.Craft,
        value: 0.6
      },
      {
        label: Contemporary.Mem,
        value: 0.8
      },
      {
        label: Contemporary.AppleNotes,
        value: 0.8
      }
    ]
  },
  {
    label: "Serendipity",
    category: MemotronFeatureCategory.RetrievalAndSynthesis,
    progress: 0,
    isPlanned: true,
    description:
      "Intelligent discovery of relevant but unexpected connections in your knowledge base",
    contemporaries: [
      {
        label: Contemporary.Ideaflow,
        value: 0.5
      },
      {
        label: Contemporary.Logseq,
        value: 0.8
      },
      {
        label: Contemporary.Readwise,
        value: 0.8
      }
    ]
  },
  {
    label: "Time machine",
    category: MemotronFeatureCategory.RetrievalAndSynthesis,
    progress: 0,
    isPlanned: true,
    isNovel: true,
    description:
      "Advanced time-travel functionality to view and interact with your knowledge base at any point in time",
    contemporaries: []
  },
  {
    label: "Public API",
    category: MemotronFeatureCategory.RetrievalAndSynthesis,
    progress: 0.5,
    isPlanned: true,
    description:
      "API integration with external platforms for data exchange and automation",
    contemporaries: [
      {
        label: Contemporary.Notion,
        value: 0.8
      },
      {
        label: Contemporary.Capacities,
        value: 0.8
      },
      {
        label: Contemporary.Anytype,
        value: 0.8
      },
      {
        label: Contemporary.Tana,
        value: 0.8
      },
      {
        label: Contemporary.Heptabase,
        value: 0.8
      }
    ]
  },
  {
    label: "MCP server",
    category: MemotronFeatureCategory.RetrievalAndSynthesis,
    progress: 0,
    isPlanned: true,
    description:
      "MCP server to support retrieval and synthesis of knowledge via AI agents",
    contemporaries: []
  },
  {
    label: "Flash cards",
    category: MemotronFeatureCategory.RetrievalAndSynthesis,
    progress: 0.25,
    isPlanned: true,
    description:
      "Spaced repetition and flashcard system for learning and memorization of important knowledge",
    contemporaries: [
      {
        label: Contemporary.Remnote,
        value: 0.8
      }
    ]
  }
];
