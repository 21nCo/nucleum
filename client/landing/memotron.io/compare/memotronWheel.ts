import {
  SourcingType,
  type IContemporary,
  type IFeatureWheelGroup,
  type IFwCategory,
  type IFwFeature
} from "$lib/client/types/featureWheel.type";
import {
  Contemporary,
  Distribution
} from "$lib/client/components/featureWheel/comparer.type";

const cdn = "https://cdn.21n.co/images/features/";

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
  { label: MemotronFeatureCategory.Views, color: "#AA6A6A" },
  { label: MemotronFeatureCategory.RetrievalAndSynthesis, color: "#7E49A1" },
  { label: MemotronFeatureCategory.App, color: "#4287f5" }
];

export const contemporaries: IContemporary[] = [
  {
    label: Contemporary.Obsidian,
    url: "https://obsidian.md",
    price: 4,
    sourcingType: SourcingType.PARTIAL,
    latestAnalysisDate: "2025-07-24",
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
    latestAnalysisDate: "2025-07-24",
    distribution: {
      available: [
        Distribution.WEB,
        Distribution.MAC,
        Distribution.WINDOWS,
        Distribution.LINUX,
        Distribution.IOS,
        Distribution.ANDROID,
        Distribution.CHROMIUM,
        Distribution.FIREFOX,
        Distribution.SAFARI
      ]
    },
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
    latestAnalysisDate: "2025-07-24",
    price: 5,
    sourcingType: SourcingType.CLOSED,
    distribution: {
      available: [
        Distribution.WEB,
        Distribution.MAC,
        Distribution.WINDOWS,
        Distribution.LINUX,
        Distribution.IOS,
        Distribution.ANDROID,
        Distribution.CHROMIUM
      ]
    },
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
    isHideForComparer: true,
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
    price: 5,
    sourcingType: SourcingType.OPEN,
    distribution: {
      available: [
        Distribution.WEB,
        Distribution.MAC,
        Distribution.WINDOWS,
        Distribution.LINUX,
        Distribution.IOS,
        Distribution.ANDROID
      ]
    },
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
    sourcingType: SourcingType.SOURCE_AVAILABLE,
    isHideForComparer: true
  },
  {
    label: Contemporary.Roam,
    url: "https://roamresearch.com",
    price: 15,
    sourcingType: SourcingType.CLOSED,
    isHideForComparer: true,
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
    isHideForComparer: true,
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
    isHideForComparer: true,
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
    isHideForComparer: true,
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
    label: Contemporary.OneNote,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Affine,
    url: "https://affine.pro",
    price: 0,
    sourcingType: SourcingType.SOURCE_AVAILABLE,
    isHideForComparer: true,
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
    isHideForComparer: true,
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
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Supernotes,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Walling,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Mem,
    url: "https://get.mem.ai",
    price: 0,
    sourcingType: SourcingType.CLOSED,
    isHideForComparer: true,
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
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Readwise,
    url: "https://readwise.io",
    price: 9.99,
    sourcingType: SourcingType.CLOSED,
    isHideForComparer: true,
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
    label: Contemporary.Scrintal,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Mymind,
    url: "https://mymind.com/",
    price: 6.58,
    sourcingType: SourcingType.CLOSED,
    whenToChoose: [
      {
        label: ""
      }
    ],
    latestAnalysisDate: "2025-07-18"
  },
  {
    label: Contemporary.Instapaper,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Raindrop,
    url: "https://raindrop.io/",
    price: 2.75,
    sourcingType: SourcingType.PARTIAL,
    distribution: {
      link: "https://raindrop.io/download",
      available: [
        Distribution.WEB,
        Distribution.MAC,
        Distribution.WINDOWS,
        Distribution.IOS,
        Distribution.ANDROID,
        Distribution.CHROMIUM,
        Distribution.FIREFOX,
        Distribution.SAFARI
      ]
    },
    whenToChoose: [
      {
        label:
          "If all you need is a simple bookmarking tool to replace browser bookmarks and want it at an extremely low cost"
      }
    ],
    latestAnalysisDate: "2025-07-20"
  },
  {
    label: Contemporary.Liner,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.AudioPen,
    url: "https://audiopen.ai/",
    price: 8.25,
    sourcingType: SourcingType.CLOSED,
    isHideForComparer: true,
    distribution: {
      link: "https://audiopen.ai/",
      available: [
        Distribution.WEB,
        Distribution.IOS,
        Distribution.ANDROID,
        Distribution.CHROMIUM
      ]
    },
    whenToChoose: [
      {
        label: "If all you need is a simple audio transcription tool."
      }
    ],
    latestAnalysisDate: "2025-07-22"
  },
  {
    label: Contemporary.ViennaScribe,
    icon: "viennascribe",
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.MilaNote,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Noted,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Bear,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Scrivener,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Ulysses,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Drafts,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.AppFlowy,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Scapple,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Scriv,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Dynalist,
    url: "https://dynalist.io",
    isHideForComparer: true
  },
  {
    label: Contemporary.Ideaflow,
    url: "https://ideaflow.io",
    isHideForComparer: true
  },
  {
    label: Contemporary.Fabric,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.AppleNotes,
    url: "https://www.icloud.com/notes",
    price: 0,
    sourcingType: SourcingType.CLOSED,
    isHideForComparer: true,
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
    label: Contemporary.Voicenotes,
    url: "https://voicenotes.com/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Milanote,
    url: "https://milanote.com/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Pinterest,
    url: "https://pinterest.com",
    isHideForComparer: true
  },
  {
    label: Contemporary.Effie,
    url: "https://www.effie.pro/",
    isHideForComparer: true
  },
  {
    label: Contemporary.ZohoNotebook,
    url: "https://notebook.zoho.com",
    isHideForComparer: true
  },
  {
    label: Contemporary.Karakeep,
    url: "https://karakeep.app/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Kortex,
    url: "https://kortex.co",
    isHideForComparer: true
  },
  {
    label: Contemporary.Noteey,
    url: "https://noteey.cn/",
    isHideForComparer: true
  },
  {
    label: Contemporary.SaveDay,
    url: "https://www.save.day/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Stacks,
    url: "https://betterstacks.com/",
    isHideForComparer: true
  },
  {
    label: Contemporary.DetaSurf,
    url: "https://deta.surf",
    isHideForComparer: true
  },
  {
    label: Contemporary.QwikNotes,
    url: "https://qwiknotes.com/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Fablehenge,
    url: "https://www.fablehenge.com/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Glasp,
    url: "https://glasp.co/",
    isHideForComparer: true
  },
  {
    label: Contemporary.SuperMemory,
    url: "https://supermemory.ai/",
    isHideForComparer: true
  },
  {
    label: Contemporary.MyLifeNote,
    url: "https://mylifenote.ai/",
    isHideForComparer: true
  },
  {
    label: Contemporary.OpenNotas,
    url: "https://opennotas.io/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Otio,
    url: "https://otio.ai",
    isHideForComparer: true
  },
  {
    label: Contemporary.MicroBlog,
    url: "https://micro.blog/",
    isHideForComparer: true
  },
  {
    label: Contemporary.CoolStuff,
    url: "https://coolstuff.app/",
    isHideForComparer: true
  },
  {
    label: Contemporary.ThinkMachine,
    url: "https://thinkmachine.com/",
    isHideForComparer: true
  },
  {
    label: Contemporary.BetterDictation,
    url: "https://betterdictation.com/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Outline,
    url: "https://www.outline.app/",
    isHideForComparer: true
  },
  {
    label: Contemporary.AmpleNote,
    url: "https://www.amplenote.com/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Memex,
    url: "https://memex.garden/",
    isHideForComparer: true
  },
  {
    label: Contemporary.OneWriter,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.IAWriter,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Zettlr,
    url: "https://zettlr.com/",
    isHideForComparer: true
  },
  {
    label: Contemporary.TheArchive,
    url: "https://zettelkasten.de/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Trickle,
    url: "https://www.trickle.so/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Emberly,
    url: "https://ember.ly/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Saga,
    url: "https://saga.so/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Strut,
    url: "https://strut.so/",
    isHideForComparer: true
  },
  {
    label: Contemporary.HeyMind,
    url: "https://heymind.co/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Beloga,
    url: "https://www.beloga.xyz/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Joplin,
    url: "https://joplinapp.org/",
    isHideForComparer: true
  },
  {
    label: Contemporary.WeTransferCollect,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Noteledge,
    url: "https://www.kdanmobile.com/noteledge",
    isHideForComparer: true
  },
  {
    label: Contemporary.RedNotebook,
    url: "https://rednotebook.app/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Slite,
    url: "https://slite.com/",
    isHideForComparer: true
  },
  {
    label: Contemporary.StandardNotes,
    url: "https://standardnotes.com/features",
    isHideForComparer: true
  },
  {
    label: Contemporary.Trilium,
    url: "https://github.com/zadam/trilium",
    isHideForComparer: true
  },
  {
    label: Contemporary.Typora,
    url: "https://typora.io/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Hypothes,
    url: "https://web.hypothes.is/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Dendron,
    url: "https://www.dendron.so/",
    isHideForComparer: true
  },
  {
    label: Contemporary.DEVONThink,
    url: "https://www.devontechnologies.com/apps/devonthink",
    isHideForComparer: true
  },
  {
    label: Contemporary.Mendeley,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.MarginNotes,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Reflect,
    url: "https://reflect.app",
    isHideForComparer: true
  },
  {
    label: Contemporary.GoogleKeep,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Noto,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Flow,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Concepts,
    url: "",
    isHideForComparer: true
  },
  {
    label: Contemporary.Confluence,
    url: "https://www.atlassian.com/software/confluence",
    isHideForComparer: true
  },
  {
    label: Contemporary.Qatalog,
    url: "https://qatalog.com/",
    isHideForComparer: true
  },
  {
    label: Contemporary.WeavaHighlighter,
    url: "https://www.weavatools.com/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Vivasnote,
    url: "https://vivasnote.com/",
    isHideForComparer: true
  },
  {
    label: Contemporary.Lazy,
    url: "https://lazy.so",
    isHideForComparer: true
  }
];

export const features: IFwFeature[] = [
  // App features
  {
    label: "Source",
    category: MemotronFeatureCategory.App,
    icon: "source",
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
        icon: "sparkle"
      },
      {
        label: "Transparent development process and regular public updates",
        icon: "eye"
      }
    ],
    comparisionProperties: ["sourcingType"],
    notes:
      "To start with, Memotron is fully open source. Not just the source code, we have our entire roadmap and development process transparent to the community. We are currently working on improving the workflow for contributing to the app from our open source community.",
    contemporaries: [
      {
        label: Contemporary.Logseq,
        value: 0.9
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
      {
        label: Contemporary.Raindrop,
        value: 0.5,
        notes:
          "Raindrop is majorly open-source with some proprietary elements like the backend server. The source code for all app distributions is available on Github and is open to contributions."
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
    notes:
      "User privacy and data ownership is at the core of how we do business. You can learn more about our core principles here: [papers.21n.org/soft](https://papers.21n.org/soft).",
    description:
      "Alignment with users' values regarding privacy, security, and ownership of their data.",
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
        label: Contemporary.Logseq,
        value: 0.75,
        notes:
          "Logseq is open source, local-first and community driven project. It has an optional end-to-end encryption for cloud sync. While the community has requested better security reporting procedures, no established bug bounty program exists. Logseq has explicit [policy](https://blog.logseq.com/privacy-policy/) against selling user data."
      },
      {
        label: Contemporary.Capacities,
        value: 0.45,
        notes:
          "Capacities has full offline support but is primarily cloud based. Capacities doesn't support end-to-end encryption for cloud sync. Capacities [explicitly](https://docs.capacities.io/more/end-to-end-encryption) states their decision to not support end-to-end encryption for cloud sync. Capacities has a [responsible disclosure policy](https://docs.capacities.io/developer/responsible-disclosure) for security vulnerabilities but ended its bug bounty program in July 2025."
      },
      {
        label: Contemporary.Obsidian,
        value: 0.9,
        notes:
          "Obsidian has an offline-first approach, and a strong end-to-end encryption implementation. Obsidian maintains an active security program with regular third-party audits. The platform has completed multiple independent security audits and provides transparent reporting of security assessments. Obsidian has a strong [privacy policy](https://obsidian.md/privacy)."
      },
      {
        label: Contemporary.Notion,
        value: 0.3,
        notes:
          "Notion doesn't take offline-first approach and does not have end-to-end encryption for cloud sync. Notion does have a [bug bounty program](https://www.notion.so/notion/Responsible-Disclosure-Policy-5f18bb6b86804eaf989c006131778b9c) and [discloses](https://www.notion.so/notion/Privacy-Policy-3468d120cf614d4c9014c09f6adc9091) that it does not sell user data for external use by other companies."
      },
      {
        label: Contemporary.Mymind,
        value: 0.4,
        notes:
          "Mymind demonstrates strong performance in core privacy [commitments](https://mymind.com/our-promise), particularly around data ownership and protection from commercial exploitation. The app has transparent privacy policies with user consent requirements. However, the app doesn't provide end-to-end encryption and offline-first functionality. There is no bug bounty program as well."
      },
      {
        label: Contemporary.Raindrop,
        value: 0.5,
        notes:
          "Raindrop doesn't have a offline version and no end-to-end encryption. However, Raindrop has a strong privacy policy and user consent requirements with [no tolerance](https://help.raindrop.io/privacy) for misuse of user data. Despite not having a bug bounty program, Raindrop being [open source](https://github.com/raindropio) and having a transparent development process makes it a little more secure."
      }
    ]
  },
  {
    label: "Reliability",
    category: MemotronFeatureCategory.App,
    progress: 0.5,
    notes:
      "We have a publicly published [status page](https://status.21n.org/) from the get-go and the historical uptime stands good at > 99%. We are committed to providing extremely reliable app. We are still working on this aspect and will be improving it in the upcoming releases.Thanks for your continued support.",
    description:
      "The ability to rely on the app to work as expected without worrying about anything. The *This just works* experience.",
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
        value: 0.8
      },
      {
        label: Contemporary.Logseq,
        value: 0.45,
        notes:
          "Logseq releases historically had reliability issues reported by the users. Logseq sync also had issues reported by the users for its unreliability and it lacks a public status page."
      },
      {
        label: Contemporary.Capacities,
        value: 0.65
      },
      {
        label: Contemporary.Notion,
        value: 0.55,
        notes:
          "While Notion maintains reliability in all other aspects, it has been historically plagued with suboptimal performance especially when dealing with large databases. Notion has a [status page](https://www.notion-status.com/) and the historical uptime stands good at > 99%."
      },
      {
        label: Contemporary.Mymind,
        value: 0.25,
        notes:
          "Mymind app is overall performant. However, Mymind shows poor transparency regarding reliability metrics. The service lacks fundamental reliability indicators like a public status page or uptime statistics. Mymind also has instances where users have reported multiple reliability issues on social forums and other platforms."
      },
      {
        label: Contemporary.Raindrop,
        value: 0.7,
        notes:
          "Raindrop has a transparent development process and has a [status page](https://status.raindrop.io/) with > 99% uptime. Performance overall is decent with some issues reported by users for bookmark saving speed, Andriod app crashes and search delays."
      }
    ]
  },
  {
    label: "Setup & maintenance",
    shortLabel: "Maintenance",
    category: MemotronFeatureCategory.App,
    progress: 0.8,
    notes:
      "Setting up Memotron for use is extremely easy as there is almost no setup required. You can start using it right away.",
    description:
      "The ability to set up and maintain the app with minimal friction, time, and effort",
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
        value: 0.65,
        notes:
          "Capacities has medium level setup and maintenance requirement due to its object centric design. Users have to keep their objects upto date as per their requirement."
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
        value: 0.3,
        notes:
          "By design, Obsidian requires its users to setup additional plugins to get the full experience and manual workflows, housekeeping for some workflows to make the most out of the tool."
      },
      {
        label: Contemporary.Logseq,
        value: 0.25,
        notes:
          "By design, Obsidian requires its users to setup additional plugins to get the full experience and manual workflows, housekeeping for some workflows to make the most out of the tool."
      },
      {
        label: Contemporary.Mymind,
        value: 0.8,
        notes:
          "Mymind has a very simple installation and setup process. Users can start saving content immediately after account creation without complex setup procedures. The app is designed around a **no folders, no tags** approach, eliminating traditional organizational setup that other tools require. Users did report that as content volume grows, search becomes increasingly difficult and running into the problem of **library overload**."
      },
      {
        label: Contemporary.Raindrop,
        value: 0.75,
        notes:
          "Raindrop performs well in this category with easy installation and first-use experience. Maintaining Raindrop is also largely a friction-free experience."
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
    notes:
      "We are not here to exit. We are here to last. Read our entire philosophy here: [papers.21n.org/soft](https://papers.21n.org/soft). While our code is open-source, we are still working on self-hosting and interoperability with other apps.",
    description:
      "Viable long-term business model ensuring the app's continued existence along with strong controls on data resuse.",
    ratingCriteria: [
      { label: "Viable long-term business model" },
      {
        label:
          "Ability to self-host on user's private cloud. (Note: this is different from the availability of full offline version of the app)"
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
        label: Contemporary.Logseq,
        value: 0.7
      },
      {
        label: Contemporary.Capacities,
        value: 0.65,
        notes:
          "Capacities is [fully funded](https://capacities.io/blog/what-if-capacities-was-gone-tomorrow) by its founders without any external investment. Capacities has good export option. Capacities doesn't support self-hosting."
      },
      {
        label: Contemporary.Notion,
        value: 0.4,
        notes:
          "Notion does not have a way to self-host on user's private cloud and it does not have full offline support to enable user's manual backups. Notion does provide an [API](https://developers.notion.com/) for integration with other apps and a robust [export feature](https://www.notion.com/help/export-your-content) which exports all the workspace content. On funding and financials, Notion is subject to closure or acquisition by other companies due to its [funding model](https://www.reddit.com/r/Notion/comments/q4c8wf/notion_raised_275m_in_new_capital_and_reaches_10/)."
      },
      {
        label: Contemporary.Mymind,
        value: 0.55,
        notes:
          "Mymind demonstrates a highly [sustainable](https://mymind.com/will-your-app-stick-around) business model with independent funding, transparent pricing, and values-aligned operations that support long-term growth without compromising user privacy. However, self-hosting is not available and interoperability with other apps is limited."
      },
      {
        label: Contemporary.Raindrop,
        value: 0.75,
        notes:
          "Raindrop has maintained a sustainable business model and has been operating for over 10 years. Raindrop operates at a lower-cost and prices the product in the lower end of the market. However, Raindrop does not support self-hosting and the developer explicitly [declined](https://raindropio.canny.io/feature-requests/p/make-open-source) community requests to open source all parts of the app to enable self-hosting. Another critial point in this area is dependency on a single developer with parts not being open-source. On Interoperability, Raindrop maintains a solid position with [API access](https://developer.raindrop.io/), [Integrations](https://raindrop.io/integrations) and [Import/Export](https://help.raindrop.io/import)."
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
        label: Contemporary.Obsidian,
        value: 0.9
      },
      {
        label: Contemporary.Capacities,
        value: 0.7
      },
      {
        label: Contemporary.Notion,
        value: 0.25,
        notes: "Notion has very limited support for offline-use."
      },
      {
        label: Contemporary.Logseq,
        value: 0.85
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
      },
      {
        label: Contemporary.Mymind,
        value: 0
      },
      {
        label: Contemporary.Raindrop,
        value: 0
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
        value: 0.7
      },
      {
        label: Contemporary.Raindrop,
        value: 0.3,
        notes:
          "Raindrop does support basic markdown but not for standalone text entries. It supports basic markdown for [notes](https://blog.raindrop.io/bookmark-notes-8057b3e2a48f) and [description](https://raindropio.canny.io/feature-requests/p/markdown-for-description-field) properties of bookmarks."
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
        label: Contemporary.Obsidian,
        value: 0.65,
        notes:
          "PDFs can be viewed and annotated using Obsidian community plugins."
      },
      {
        label: Contemporary.Capacities,
        value: 0.45,
        notes:
          "Capacities has native PDF upload, viewing support and notes. However, pdf annotation is not available."
      },
      {
        label: Contemporary.Evernote,
        value: 0.6
      },
      {
        label: Contemporary.Logseq,
        value: 0.85
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
      },
      {
        label: Contemporary.Mymind,
        value: 0.5,
        notes:
          "Mymind supports PDF files viewing and getting more context from the PDF files using features like TLDR, AI tags, summaries etc. However, PDF annotation is not supported."
      },
      {
        label: Contemporary.Raindrop,
        value: 0.7,
        notes:
          "Raindrop has native support for PDFs. PDF files can be uploaded and viewed natively within the app on desktop and web. Annotation of PDFs is also supported."
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
        label: "Native audio playback."
      },
      {
        label:
          "Transcription capabilities with an option to transcribe the audio locally without any additional AI credits or plans."
      },
      {
        label:
          "Transcription with timestamping and text auto conversion to markdown."
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.5,
        notes:
          "Audio files can be viewed and transcribed using Obsidian community plugins."
      },
      {
        label: Contemporary.Capacities,
        value: 0.35,
        notes:
          "Audio files can be uploaded and viewed in Capacities. However, there is no transcription capability."
      },
      {
        label: Contemporary.Notion,
        value: 0.4,
        notes:
          "Notion has Meeting notes AI feature which records and transcribes audio. However, it is not timestamped, doesn't auto convert text to markdown and there is no playback for the audio."
      },
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
        label: Contemporary.Evernote,
        value: 0.6
      },
      {
        label: Contemporary.Logseq,
        value: 0.3,
        notes:
          "Logseq has limited audio support and doesn't have transcription capability."
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
      // {
      //   label: Contemporary.Notion,
      //   value: 0.5
      // },
      // {
      //   label: Contemporary.Capacities,
      //   value: 0.5
      // },
      // {
      //   label: Contemporary.Heptabase,
      //   value: 0.5
      // },
      // {
      //   label: Contemporary.Tana,
      //   value: 0.5
      // },
      // {
      //   label: Contemporary.Anytype,
      //   value: 0.5
      // },
      // {
      //   label: Contemporary.Evernote,
      //   value: 0.8
      // },
      // {
      //   label: Contemporary.Logseq,
      //   value: 0.2
      // },
      // {
      //   label: Contemporary.Remnote,
      //   value: 0.8
      // },
      // {
      //   label: Contemporary.Roam,
      //   value: 0.2
      // },
      // {
      //   label: Contemporary.Affine,
      //   value: 0.8
      // },
      // {
      //   label: Contemporary.Craft,
      //   value: 0.6
      // },
      // {
      //   label: Contemporary.Mem,
      //   value: 0.6
      // }
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
    icon: "textcapture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.8,
    description:
      "Ability to quickly capture text. This is different from text or web clipping. The text capture is the ability to capture text information in a standalone manner like using markdown editor or textbox.",
    ratingCriteria: [
      {
        label:
          "Quick and frictionless capture of text. Should take minimal number of interactions to start typing in the text after opening the app."
      },
      {
        label: "Support to upload text files."
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
        label: Contemporary.Evernote,
        value: 0.5,
        notes: "Single-click capture only on mobile, limited on desktop and web"
      },
      {
        label: Contemporary.Logseq,
        value: 0.55,
        notes:
          "While Logseq has text capture capability, by design it enforces certain way of capturing text which is via journal."
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
      },
      {
        label: Contemporary.Mymind,
        value: 0.85
      },
      {
        label: Contemporary.Raindrop,
        value: 0.25,
        notes:
          "Raindrop has very limited support for text capture. Users cannot create or edit new text files. Uploading text files is the only way to capture text and it is not editable either. However, annotation of the uploaded text files is supported."
      }
    ]
  },
  {
    label: "Camera capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.8,
    description:
      "Quickly capturing image or video using the camera of user's device.",
    ratingCriteria: [
      {
        label: "Quick and frictionless capture using native device camera."
      },
      {
        label:
          "Should take minimal number of interactions to start capturing using camera."
      },
      {
        label: "Support to upload images and videos."
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Capacities,
        value: 0.7,
        notes:
          "Capacities has frictionless camera capture on mobile devices using quick actions. Camera capture can aslo be triggered from markdown -> Add -> image -> Select file -> Take photo."
      },
      {
        label: Contemporary.Obsidian,
        value: 0.5,
        notes:
          "Obsidian has the ability to trigger a camera when taking markdown notes on mobile devices. However, this is not standalone, needs to be accessed via markdown, not very intuitive and is only available on mobile devices."
      },
      {
        label: Contemporary.Notion,
        value: 0.55,
        notes:
          "While Notion does support triggering of native camera, it has to be done from markdown -> image -> Take a picture. This is not as frictionless as per our rating criteria. Also, this is only available on mobile apps."
      },
      {
        label: Contemporary.Evernote,
        value: 0.6
      },
      {
        label: Contemporary.Logseq,
        value: 0.55,
        notes:
          "Logseq has the ability to trigger a camera when taking markdown notes on mobile devices. But, it is not as frictionless as per our rating criteria and it is only available on mobile devices."
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
      },
      {
        label: Contemporary.Mymind,
        value: 0.75,
        notes:
          "Mymind supports capturing content using camera and also has OCR text recognition."
      },
      {
        label: Contemporary.Raindrop,
        value: 0.3,
        notes:
          "Raindrop has very limited support for camera capture as well. Users cannot capture new photos or videos triggering native camera. Uploading photos or videos is supported via Files feature."
      }
    ]
  },
  {
    label: "Audio capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.8,
    description:
      "Ability to quickly capture information using voice recording which can be played back or downloaded in the app later.",
    ratingCriteria: [
      {
        label: "Quick and frictionless audio capture."
      },
      {
        label:
          "Should take minimal number of interactions to start capturing using audio recorder."
      },
      {
        label: "Native audio recording support with clear UI and controls."
      },
      {
        label: "Upload audio files."
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Capacities,
        value: 0.3,
        notes:
          "Capacities doesnot have native audio recording. Uploading audio file is only way to capture audio."
      },
      {
        label: Contemporary.Obsidian,
        value: 0.75,
        notes:
          "Obsidian has support for audio via file upload by default and audio recorder can be enabled from the app's core plugins. The audio recorder option is quickly accessible. However, the audio recorder doesn't have any user interface and controls."
      },
      {
        label: Contemporary.Notion,
        value: 0.5,
        notes:
          "While Notion does support triggering of native audio recorder, it has to be done from markdown -> AI Meeting notes. This is Notion's new transcription feature and doesn't support audio playback. The only way to have audio that has playback is to upload audio files in Notion."
      },
      {
        label: Contemporary.Evernote,
        value: 0.6
      },
      {
        label: Contemporary.Logseq,
        value: 0.55,
        notes:
          "Logseq has native ability to record audio and insert it into markdown. The experience is mostly frictionless but this is limited to only mobile devices and is not standalone."
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
      },
      {
        label: Contemporary.Raindrop,
        value: 0.25,
        notes:
          "Raindrop has very limited support to capture audio. Users cannot capture new audio files triggering native audio recorder. Uploading audio files is supported via Files feature. Audio transcripton or annotation is not available."
      }
    ]
  },
  {
    label: "Type capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.8,
    isNovel: true,
    description:
      "Capturing new information using types which enables capturing of properties, adding to the collection while capturing. Note: this is different from having types/databases in the app.",
    ratingCriteria: [
      {
        label:
          "Quick and frictionless capture of a type i.e. setting properties for the newly captured information."
      },
      {
        label:
          "Should take minimal number of interactions to start capturing a type."
      },
      {
        label:
          "Ability to capture properties of various types like rating, date, single/multi select, etc."
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Capacities,
        value: 0.75,
        notes:
          "Capacities excels at creating new types/objects and setting properties with ease."
      },
      {
        label: Contemporary.Obsidian,
        value: 0.35,
        notes:
          "Obsidian does support properties/types using their **Properties** core plugin. However, capturing properties is not intuitive. For example, capturing a date property requires the user to Add new property -> Type date text. Only once the initial value is typed, a GUI interface for date picker is shown. Also, the kind of properties supported are [limited](https://help.obsidian.md/properties). The property workflow of Obsidian like most other workflows in Obsidian are heavily geared towards tech savvy users."
      },
      {
        label: Contemporary.Notion,
        value: 0.5,
        notes:
          "Notion does have types functionality with name `Databases`. However, there isn't an easy way to capture an instance of a type with ease. \n See [Round trip capture](https://docs.memotron.app/memotron/anti-productivity/round-trip-capture) for more information."
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
    icon: "webclip",
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
        value: 0.4,
        notes:
          "Web pages and text hightlights from web pages can be saved to Obsidian using their clipper extension. All other abilities from our rating criteria are not available. Also, saving a web page or highlights opens the app each time due to the architecture of the app."
      },
      {
        label: Contemporary.Notion,
        value: 0.35,
        notes:
          "Notion has a very rudimentary clipper extension which can save web pages. It doesn't support text highlighting, screenshot, adding notes, etc. There are some community created extensions which can be used to clip web pages, screenshots etc which are much better and reliable than the official extension."
      },
      {
        label: Contemporary.Capacities,
        value: 0.3,
        notes:
          "Capacities has a basic clipper extension which can save web pages and has the ability to add notes. It doesn't support text highlighting, screenshot, etc. Community integrations are available for improving the clipping experience but require additional app setup and purchases."
      },
      {
        label: Contemporary.Remnote,
        value: 0.4
      },
      {
        label: Contemporary.Mymind,
        value: 0.5,
        notes:
          "Mymind has a very intuitive browser extension to clip web pages and text from web pages into Mymind app. However, the extension does not persist text highlights on the web page when returning to the page, doesn't show the list of highlights, doesn't support screenshot and the ability to take notes"
      },
      {
        label: Contemporary.Raindrop,
        value: 0.8,
        notes:
          "Raindrop mostly excels at this feature of web clipping. Saving a web page, text highlighting, adding notes and retaining of text highlights are all available. Raindrop also supports saving a bookmark using keyboard shortcut. However, despite having side panel on their extension, all highlights of a web page cannot be viewed intuitively, clicked and scrolled to from the side panel. Highlights can be scrolled to by clicking on small breadcrumbs on the right side of the web page. Screenshot to save is not available."
      },
      {
        label: Contemporary.Instapaper,
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
        value: 0.25,
        notes:
          "Very limited clipping is available to clip content from web into Logseq via some community created extensions."
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
      },
      {
        label:
          "First class viewing support for saved youtube videos and timestamps."
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Liner,
        value: 0.75
      },
      {
        label: Contemporary.Capacities,
        value: 0.35,
        notes:
          "Capacities has a basic clipper extension which can save Youtube videos and has the ability to add notes."
      },
      {
        label: Contemporary.Obsidian,
        value: 0.35,
        notes:
          "Obsidian clipper can be used to save Youtube videos like any other web page. This creates a youtube embed in the saved markdown. Video timestamp highlighting and viewing the list of highlights is not available."
      },
      {
        label: Contemporary.Notion,
        value: 0.4,
        notes:
          "Notion clipper extension can be used to save Youtube videos. It lacks all other abilities from our rating criteria. However, some third party [extensions](https://chromewebstore.google.com/detail/youtube-notes-to-notion-w/kojibkalenabblnhoihknojdfapbbmig?hl=en-US&utm_source=ext_sidebar) can be used to save Youtube videos and take notes."
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
      },
      {
        label: Contemporary.Mymind,
        value: 0.25,
        notes:
          "Mymind extension can be used to save Youtube videos. But, doesn't support highlighting and taking notes on the video."
      },
      {
        label: Contemporary.Raindrop,
        value: 0.25,
        notes:
          "Raindrop extension can be used to save Youtube videos and take notes. But, the app doesn't support highlighting and playback of saved youtube videos seems to be broken."
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
        label:
          "Ability to save tweets from Twitter in a quick and frictionless manner."
      },
      {
        label: "Ability to add additional notes to the tweet."
      },
      {
        label: "First class viewing support for saved tweets."
      },
      {
        label:
          "Capture tweets more efficiently from home page or replies section without the need to open a tweet page just to clip."
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Readwise,
        value: 0.6
      },
      {
        label: Contemporary.Capacities,
        value: 0.35,
        notes:
          "Capacities clipper can be used to save tweets like any other web page and add notes to it. The saved tweets can be viewed in the app using native Twitter API. The clipper lacks an efficient way to capture individual tweets on the web page."
      },
      {
        label: Contemporary.Obsidian,
        value: 0.3,
        notes:
          "Obsidian clipper can be used to save tweets like any other web page and the tweet text will be copied on to the markdown. The clipper lacks an efficient way to capture individual tweets on the web page and the app opens the app for each clip."
      },
      {
        label: Contemporary.Notion,
        value: 0.3,
        notes:
          "Notion clipper extension can be used to save tweets. It lacks all other abilities from our rating criteria. Some third party extensions can be used to save tweets more efficiently."
      },
      {
        label: Contemporary.Mymind,
        value: 0.4,
        notes:
          "Mymind extension can be used to save tweets and has first-class viewing support for saved tweets. But, doesn't support taking notes on the tweet or capturing more efficiently."
      },
      {
        label: Contemporary.Raindrop,
        value: 0.25,
        notes:
          "Raindrop extension can be used to save tweets and take notes. But, the app just like youtube videos doesn't support first-class viewing of saved tweets. At the time of this analysis, the preview showed the following error on web app `x.com not reachable or blocks site preview.`."
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
      // {
      //   label: Contemporary.Readwise,
      //   value: 0.6
      // }
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
      // {
      //   label: Contemporary.Evernote,
      //   value: 0.8
      // },
      // {
      //   label: Contemporary.Logseq,
      //   value: 0.6
      // },
      // {
      //   label: Contemporary.Anytype,
      //   value: 0.8
      // },
      // {
      //   label: Contemporary.Heptabase,
      //   value: 0.8
      // }
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
        label: "Ability to import highlights and notes from Kindle."
      },
      {
        label: "Ability to add additional notes to the highlights."
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Readwise,
        value: 0.8
      },
      {
        label: Contemporary.Capacities,
        value: 0.3,
        notes:
          "Integration with Readwise is repeatedly emphasized by Capacities and it is on their roadmap. This facilitates syncing of Kindle highlights and notes. However, it is not available yet as of July 2025 at the time of this analysis and even with this integration, users will have to have additional subscription to Readwise to sync highlights and notes."
      },
      {
        label: Contemporary.Obsidian,
        value: 0.65,
        notes:
          "Kindle highlights can be synced to Obsidian using community plugins."
      },
      {
        label: Contemporary.Notion,
        value: 0.4,
        notes:
          "Notion doesn't provide direct sync from Kindle. Some third party paid solutions and manual scraping workflows are available to sync from kindle."
      }
    ]
  },
  {
    label: "Web video clipping",
    category: MemotronFeatureCategory.Clipping,
    progress: 0,
    isPlanned: true,
    description: "",
    contemporaries: []
  },
  {
    label: "Audible highlights",
    category: MemotronFeatureCategory.Clipping,
    progress: 0,
    isPlanned: true,
    isHideForComparer: true,
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
    ratingCriteria: [
      {
        label:
          "Ability to quickly add tags or assign to a collection when clipping from web or from other apps on mobile."
      },
      {
        label:
          "Ability to link new information to previosly saved information (entries) on the app."
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Anytype,
        value: 0.8
      },
      {
        label: Contemporary.Obsidian,
        value: 0.75,
        notes:
          "Obsidian clipper has the ability to add links in the text box presented via mentioning or tagging."
      },
      {
        label: Contemporary.Capacities,
        value: 0.3,
        notes:
          "Capacities doesn't have the ability to curate while linking. The ability to add tags from clipper when saving is rudimentary and doesn't even show the list of existing tags."
      },
      {
        label: Contemporary.Notion,
        value: 0.35,
        notes:
          "Notion clipper has database selection option for curation while clipping. Apart from that, there is no other ways to link to other entries."
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
      },
      {
        label: Contemporary.Mymind,
        value: 0.4,
        notes:
          "Mymind extension provides the ability to quickly add tags when clipping web pages. This is a useful way to curate while linking. However, it is limited to only adding tags."
      },
      {
        label: Contemporary.Raindrop,
        value: 0.5,
        notes:
          "Raindrop extension provides the ability to quickly add tags, and also assign to a collection when clipping web pages. This is a useful way to curate while linking. However, it is limited to only adding tags and collections."
      }
    ]
  },
  {
    label: "Nodularity",
    category: MemotronFeatureCategory.Curation,
    progress: 0.8,
    isNovel: true,
    description: "Granularity in long form content like markdown.",
    ratingCriteria: [
      {
        label:
          "Ability to associate new information to an exact location in a markdown node i.e. headings and sub headings."
      },
      {
        label:
          "Ability to search and view exact sub parts of markdown instead of opening the full content."
      },
      {
        label:
          "Ability to focus or zoom into a sub part of the markdown content."
      },
      {
        label:
          "Ability to link / reference or mention sub parts of the markdown content in another markdown or nodes with ease."
      }
    ],
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
        label: Contemporary.Notion,
        value: 0.3,
        notes:
          "Notion doesn't have outlining or granular approach for markdown. Ability to copy the link to a block and then reference it in another markdown is the only feature available in this area."
      },
      {
        label: Contemporary.Logseq,
        value: 0.5,
        notes: "Logseq has outliner based nodularity."
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
    icon: "collection",
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
        value: 0.75
      },
      {
        label: Contemporary.Obsidian,
        value: 0.75
      },
      {
        label: Contemporary.Capacities,
        value: 0.75
      },
      {
        label: Contemporary.Notion,
        value: 0.65,
        notes:
          "Notion doesn't support collections or tags separately. However, a Notion database without any properties can be used as a simple collection"
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
      },
      {
        label: Contemporary.Mymind,
        value: 0.8
      },
      {
        label: Contemporary.Raindrop,
        value: 0.85
      }
    ]
  },
  {
    label: "Types/Objects",
    icon: "type",
    category: MemotronFeatureCategory.Curation,
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
        label: Contemporary.Notion,
        value: 0.9,
        notes:
          "Notion has the most robust types/objects system with solid support for wide variety of properties via its database feature."
      },
      {
        label: Contemporary.Obsidian,
        value: 0.55,
        notes:
          "Obsidian's **properties** plugin provides the ability to create types/objects with a title, and properties. However, the properties are limited and the plugins scope for avatars is limited."
      },
      {
        label: Contemporary.Capacities,
        value: 0.85,
        notes: "Types/objects feature is the strongest element of Capacities."
      },
      {
        label: Contemporary.Anytype,
        value: 0.7
      },
      {
        label: Contemporary.Tana,
        value: 0.5
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
        label: "Ability to create and view backlinks to other nodes."
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.85
      },
      {
        label: Contemporary.Notion,
        value: 0.85
      },
      {
        label: Contemporary.Capacities,
        value: 0.85
      },
      {
        label: Contemporary.Logseq,
        value: 0.85
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
    label: "Link suggestions",
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
        label: "Ability to take notes for a specific date."
      },
      {
        label:
          "Ability to take notes on higher time periods like month, year etc for planning and retrospection purposes."
      },
      {
        label:
          "Ability to view information captured or clipped on a particular day."
      },
      {
        label:
          "Ability to switch between time scales like day, week, month, year to gain better perspective."
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
        label: Contemporary.Capacities,
        value: 0.75,
        notes:
          "Capacities has daily notes functionality and calendar view. Capacities also has retrospection. However, higher time period notes is not available."
      },
      {
        label: Contemporary.Obsidian,
        value: 0.7,
        notes:
          "Obsidian has a core plugin for daily notes and has good community plugin support for various calendar views. However, none of the available plugins has higher time period support for notes. Obsidian community also published plugins for reflection and retrospection."
      },
      {
        label: Contemporary.Notion,
        value: 0.4,
        notes:
          "Notion has calendar capability. However, this capability is heavily centered towards events, reminders etc and doesn't support any of the rating criteria that we have for calendar. Also, Notion calendar is a separate app altogether which requires additional installation."
      },
      {
        label: Contemporary.Logseq,
        value: 0.25,
        notes:
          "Logseq supports calendar via plugin and has very limited functionality."
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
    description:
      "Graph view for visual organization of entire knowledge base. Note: This is different from local graph of a particular node in question.",
    ratingCriteria: [
      {
        label: "Ability to view the entire knowledge base as a graph."
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.85
      },
      {
        label: Contemporary.Logseq,
        value: 0.85
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
    description: "High-level overview for a local node",
    ratingCriteria: [
      {
        label:
          "Ability to view all the connected links for a local node visually on a high level."
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Roam,
        value: 0.7
      },
      {
        label: Contemporary.Capacities,
        value: 0.75
      },
      {
        label: Contemporary.Obsidian,
        value: 0.7
      },
      {
        label: Contemporary.Heptabase,
        value: 0.55
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
        value: 0.85
      },
      {
        label: Contemporary.Obsidian,
        value: 0.65,
        notes:
          "Obsidian has community plugins which can be used for creating kanban style boards."
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
        value: 0.85
      },
      {
        label: Contemporary.Obsidian,
        value: 0.65,
        notes:
          "Obsidian has community plugins like DataView and DB folders which can be used for creating table views."
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
    ratingCriteria: [
      {
        label: "Basic keyword based search"
      },
      {
        label: "Fuzzy search (to support spelling mistakes, partial words, etc)"
      },
      {
        label: "Operators to refine search results"
      },
      {
        label:
          "Extremely performant search even with large volume data (50,000+ records)"
      },
      {
        label:
          "Support to search in audio transcriptions and images (if audio and images are available)"
      },
      {
        label:
          "Search ranking, weight tuning and great relevancy in search results."
      },
      {
        label:
          "Web text, Pdf, Kindle highlights all should be supported in search (if these types of data is supported by the app)"
      }
    ],
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.85
      },
      {
        label: Contemporary.Notion,
        value: 0.8
      },
      {
        label: Contemporary.Capacities,
        value: 0.85
      },
      {
        label: Contemporary.Evernote,
        value: 0.8
      },
      {
        label: Contemporary.Logseq,
        value: 0.85
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
      },
      {
        label: Contemporary.Mymind,
        value: 0.7
      },
      {
        label: Contemporary.Raindrop,
        value: 0.65
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
