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
  Taco = "AI",
  Retrospection = "Retrospection",
  Processing = "Processing",
  Retrieval = "Retrieval",
  Synthesis = "Synthesis"
}

export const categories: IFwCategory[] = [
  { label: MemotronFeatureCategory.Capture, color: "#2A8CAB" },
  { label: MemotronFeatureCategory.Content, color: "#1E9B92" },
  { label: MemotronFeatureCategory.Clipping, color: "#4E9973" },
  { label: MemotronFeatureCategory.Curation, color: "#D4A534" },
  { label: MemotronFeatureCategory.Taco, color: "#7E49A1" },
  { label: MemotronFeatureCategory.Views, color: "#AA6A6A" },
  { label: MemotronFeatureCategory.App, color: "#C87F1E" }
  // { label: MemotronFeatureCategory.Retrospection, color: "#4287f5" }
];

export const features: IFwFeature[] = [
  // App features
  {
    label: "Source",
    category: MemotronFeatureCategory.App,
    progress: 1,
    isProminent: true,
    description:
      "Source available applications with transparent development and community contributions",
    ratingCriteria: [
      { label: "Source code is available", icon: "ph:code-light" },
      { label: "Community support is available", icon: "ph:sparkle-light" },
      { label: "Regular updates are available", icon: "ph:clock-light" },
      { label: "Transparent development process", icon: "ph:eye-light" }
    ],
    comparisionProperties: ["sourcingType"],
    notes:
      "We are working on making the app source available in the future as per our [SOFT](https://papers.21n.org/soft) framework adherence. We will also be adding more features to the app to make it more useful and easier to use.",
    contemporaries: [
      {
        label: Contemporary.Logseq,
        value: 0.8,
        notes: "Logseq is an open-source project."
      },
      {
        label: Contemporary.Anytype,
        value: 0.8,
        notes:
          "Anytype has a unique approach to source availability with their source-available license"
      },
      {
        label: Contemporary.Obsidian,
        value: 0.4,
        notes:
          "While Obsidian itself isn't open source, the plugins built on top of Obsidian are open-source."
      }
    ]
  },
  {
    label: "Setup & maintenance",
    category: MemotronFeatureCategory.App,
    progress: 0.8,
    description:
      "The ability to set up and maintain the app with minimal friction, time, and effort",
    ratingCriteria: [
      { label: "Easy installation" },
      { label: "Easy configuration" },
      { label: "Consistent maintenance" },
      { label: "Minimal friction" }
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
        value: 0.15
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
      "Inclusive design supporting various accessibility needs like screen readers and keyboard navigation",
    contemporaries: []
  },
  {
    label: "Interoperability",
    category: MemotronFeatureCategory.App,
    progress: 0.1,
    isPlanned: true,
    description:
      "Integration with other apps and services through APIs, plugins, and import/export capabilities",
    contemporaries: [
      {
        label: Contemporary.Notion,
        value: 0.8
      },
      {
        label: Contemporary.AppleNotes,
        value: 0.2
      }
    ]
  },
  {
    label: "User alignment",
    category: MemotronFeatureCategory.App,
    progress: 0.9,
    description:
      "Philosophically aligned with users' values regarding privacy, ownership, and long-term sustainability",
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.7
      },
      {
        label: Contemporary.Notion,
        value: 0.2
      }
    ]
  },
  {
    label: "Sustainability",
    category: MemotronFeatureCategory.App,
    progress: 0.9,
    description:
      "Viable long-term business model ensuring the app's continued existence and development",
    contemporaries: [
      {
        label: Contemporary.Obsidian,
        value: 0.7
      }
    ]
  },
  {
    label: "Offlinability",
    category: MemotronFeatureCategory.App,
    progress: 0.9,
    description:
      "Fully functional offline with local-first data storage and synchronization when online",
    contemporaries: [
      {
        label: Contemporary.Capacities,
        value: 0.8
      },
      {
        label: Contemporary.Notion,
        value: 0.5
      }
    ]
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
      }
    ]
  },
  {
    label: "Pdf",
    category: MemotronFeatureCategory.Content,
    progress: 0.8,
    description:
      "Native PDF viewing, annotation, highlighting, and note-taking capabilities",
    contemporaries: [
      {
        label: Contemporary.Remnote,
        value: 0.8
      }
    ]
  },
  {
    label: "Audio",
    category: MemotronFeatureCategory.Content,
    progress: 0.75,
    description:
      "Audio file support with playback, annotation, and transcription capabilities",
    contemporaries: []
  },
  {
    label: "Advanced Md",
    category: MemotronFeatureCategory.Content,
    progress: 0.3,
    isPlanned: true,
    isNovel: true,
    description:
      "Extended Markdown features including custom blocks, embeds, and interactive elements",
    contemporaries: [
      {
        label: Contemporary.Notion,
        value: 0.8
      },
      {
        label: Contemporary.Capacities,
        value: 0.8
      }
    ]
  },
  {
    label: "Traces",
    category: MemotronFeatureCategory.Content,
    progress: 0,
    isPlanned: true,
    description:
      "Ability to track and visualize the evolution of content over time",
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
    contemporaries: [
      {
        label: Contemporary.Notion,
        value: 0.4
      },
      {
        label: Contemporary.Capacities,
        value: 0.4
      }
    ]
  },

  // Capture features
  {
    label: "Seamless capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.4,
    isPlanned: true,
    isHideForComparer: true,
    description:
      "Quick and frictionless information capture from any context or device",
    contemporaries: []
  },
  {
    label: "Type capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.8,
    isNovel: true,
    description:
      "Structured capture with predefined templates and formats for different content types",
    contemporaries: []
  },
  {
    label: "Audio capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.8,
    description:
      "Voice recording with automatic transcription and organization capabilities",
    contemporaries: []
  },
  {
    label: "Camera capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.8,
    description:
      "Image capture with OCR and automatic organization into your knowledge base",
    contemporaries: []
  },
  {
    label: "Outlining",
    category: MemotronFeatureCategory.Capture,
    progress: 0,
    isPlanned: true,
    description:
      "Hierarchical outlining tools for structured thinking and organization",
    contemporaries: [
      {
        label: Contemporary.Remnote,
        value: 0.7
      },
      {
        label: Contemporary.Dynalist,
        value: 0.5
      }
    ]
  },
  {
    label: "Sketch capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0,
    isPlanned: true,
    description:
      "Drawing and sketching capabilities with digital pen support and organization",
    contemporaries: []
  },

  // Clipping features
  {
    label: "Clip from web",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.8,
    description:
      "Web content clipping with browser extensions and mobile apps for saving articles and pages",
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
      }
    ]
  },
  {
    label: "Youtube clipping",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.75,
    description:
      "YouTube video clipping with timestamp marking and transcription capabilities",
    contemporaries: [
      {
        label: Contemporary.Liner,
        value: 0.3
      }
    ]
  },
  {
    label: "Tweet clipping",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.75,
    description: "Clipping tweets",
    contemporaries: []
  },
  {
    label: "Other socials clipping",
    category: MemotronFeatureCategory.Clipping,
    progress: 0,
    isPlanned: true,
    description: "Clipping other social posts like Linkedin, Reddit, etc.",
    contemporaries: []
  },
  {
    label: "Clip from mobile",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.1,
    isPlanned: true,
    description:
      "Mobile-optimized clipping experience for capturing content on smartphones and tablets",
    contemporaries: []
  },
  {
    label: "Kindle highlights",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.8,
    description:
      "Import and organization of Kindle highlights and notes with book metadata",
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
    label: "Clip from desktop",
    category: MemotronFeatureCategory.Clipping,
    progress: 0,
    isPlanned: true,
    description:
      "Desktop screen clipping and snipping tools for capturing any content on your computer",
    contemporaries: []
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
    label: "Scribd highlights",
    category: MemotronFeatureCategory.Clipping,
    progress: 0,
    isPlanned: true,
    description:
      "Import and organization of Scribd highlights and notes with document metadata",
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
      "One-click curation process for content from various sources into your knowledge system",
    contemporaries: []
  },
  {
    label: "Nodularity",
    category: MemotronFeatureCategory.Curation,
    progress: 0.8,
    isNovel: true,
    description:
      "Atomized content organization with interconnected nodes for flexible knowledge structures",
    contemporaries: []
  },
  {
    label: "Types/Objects",
    category: MemotronFeatureCategory.Curation,
    progress: 0.75,
    description:
      "Structured data with custom types, properties, and relations for organized knowledge",
    contemporaries: [
      {
        label: Contemporary.Capacities,
        value: 0.7
      },
      {
        label: Contemporary.Heptabase,
        value: 0.7
      },
      {
        label: Contemporary.Tana,
        value: 0.7
      },
      {
        label: Contemporary.Anytype,
        value: 0.7
      },
      {
        label: Contemporary.Notion,
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
    contemporaries: []
  },
  {
    label: "Flash cards",
    category: MemotronFeatureCategory.Curation,
    progress: 0,
    isPlanned: true,
    description:
      "Spaced repetition and flashcard system for learning and memorization of important knowledge",
    contemporaries: []
  },

  // Views features
  {
    label: "Board view",
    category: MemotronFeatureCategory.Views,
    progress: 0.75,
    description:
      "Kanban-style board view for visual organization and workflow management",
    contemporaries: []
  },
  {
    label: "Bird view",
    category: MemotronFeatureCategory.Views,
    progress: 0.75,
    isNovel: true,
    description:
      "High-level overview visualization of your entire knowledge base and its connections",
    contemporaries: []
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
      }
    ]
  },
  {
    label: "Calendar",
    category: MemotronFeatureCategory.Views,
    progress: 0.75,
    isNovel: true,
    description:
      "Time-based visualization of content with chronological organization capabilities",
    contemporaries: []
  },
  {
    label: "Space",
    category: MemotronFeatureCategory.Views,
    progress: 0,
    isPlanned: true,
    isNovel: true,
    description:
      "Spatial canvas for free-form organization and visualization of knowledge connections",
    contemporaries: []
  },

  // AI features
  {
    label: "Audio transcription",
    category: MemotronFeatureCategory.Taco,
    progress: 0.75,
    description:
      "AI-powered transcription of audio recordings with speaker detection and organizational features",
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
      }
    ]
  },
  {
    label: "NL Search",
    category: MemotronFeatureCategory.Taco,
    progress: 0,
    isPlanned: true,
    isNovel: true,
    description:
      "Natural language search capabilities for finding content using conversational queries",
    contemporaries: []
  },
  {
    label: "Forelink suggestions",
    category: MemotronFeatureCategory.Taco,
    progress: 0,
    isPlanned: true,
    isNovel: true,
    description:
      "AI-suggested connections between content based on semantic similarity and relationships",
    contemporaries: []
  },
  {
    label: "Voice interaction",
    category: MemotronFeatureCategory.Taco,
    progress: 0,
    isPlanned: true,
    isNovel: true,
    description:
      "Voice commands and dictation for hands-free interaction with your knowledge base",
    contemporaries: []
  },
  {
    label: "Auto summarizer",
    category: MemotronFeatureCategory.Taco,
    progress: 0,
    isPlanned: true,
    isNovel: true,
    description:
      "Automatic generation of summaries for long-form content and collections of notes",
    contemporaries: []
  },
  {
    label: "Serendipity",
    category: MemotronFeatureCategory.Taco,
    progress: 0,
    isPlanned: true,
    description:
      "Intelligent discovery of relevant but unexpected connections in your knowledge base",
    contemporaries: [
      {
        label: Contemporary.Ideaflow,
        value: 0.5
      }
    ]
  },
  {
    label: "Text editing AI",
    category: MemotronFeatureCategory.Taco,
    progress: 0,
    isPlanned: true,
    description:
      "AI-powered assistance for writing, editing, and refining text content",
    contemporaries: []
  },

  // Retrospection features
  {
    label: "Heatmap",
    category: MemotronFeatureCategory.Retrospection,
    progress: 0.4,
    isPlanned: true,
    description:
      "Visual representation of activity and engagement patterns across your knowledge base",
    contemporaries: []
  },
  {
    label: "Rewind",
    category: MemotronFeatureCategory.Retrospection,
    progress: 0,
    isPlanned: true,
    isNovel: true,
    description:
      "Timeline-based exploration of past versions and evolution of your knowledge base",
    contemporaries: []
  },
  {
    label: "Time machine",
    category: MemotronFeatureCategory.Retrospection,
    progress: 0,
    isPlanned: true,
    isNovel: true,
    description:
      "Advanced time-travel functionality to view and interact with your knowledge base at any point in time",
    contemporaries: []
  },
  {
    label: "Processing",
    category: MemotronFeatureCategory.Processing,
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
      }
    ]
  },
  {
    label: "Semantic search",
    category: MemotronFeatureCategory.Retrieval,
    progress: 0.8,
    description:
      "Concept and meaning-based search powered by advanced embedding models",
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
      }
    ]
  },
  {
    label: "API integration",
    category: MemotronFeatureCategory.Synthesis,
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
    label: "Spaced repetition",
    category: MemotronFeatureCategory.Synthesis,
    progress: 0.25,
    isPlanned: true,
    description:
      "AI-driven spaced repetition for optimal knowledge retention and recall",
    contemporaries: [
      {
        label: Contemporary.Remnote,
        value: 0.8
      }
    ]
  }
];

export const contemporaries: IContemporary[] = [
  {
    label: Contemporary.Obsidian,
    url: "https://obsidian.md",
    price: 4,
    sourcingType: SourcingType.SOURCE_AVAILABLE,
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
        label: "AI editing features"
      }
    ]
  },
  {
    label: Contemporary.Capacities,
    url: "https://capacities.app"
  },
  {
    label: Contemporary.Evernote,
    url: ""
  },
  {
    label: Contemporary.Roam,
    url: "https://roamresearch.com"
  },
  {
    label: Contemporary.Anytype,
    url: "https://anytype.io",
    sourcingType: SourcingType.SOURCE_AVAILABLE
  },
  {
    label: Contemporary.Remnote,
    url: "https://remnote.io"
  },

  {
    label: Contemporary.Logseq,
    url: ""
  },
  {
    label: Contemporary.Heptabase,
    url: "https://heptabase.com"
  },
  {
    label: Contemporary.Craft,
    url: ""
  },
  {
    label: Contemporary.Tana,
    url: "https://tana.ai"
  },
  {
    label: Contemporary.Affine,
    url: ""
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
    url: ""
  },
  {
    label: Contemporary.XMind,
    url: ""
  },
  {
    label: Contemporary.Readwise,
    url: ""
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
  }
];
