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
    label: "Agent mode",
    category: MemotronFeatureCategory.App,
    progress: 0,
    isPlanned: true,
    isNovel: true,
    description:
      "Voice commands and dictation for hands-free interaction with your knowledge base",
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
      }
    ]
  },
  {
    label: "Pdf",
    category: MemotronFeatureCategory.Content,
    progress: 0.8,
    description: "Native PDF viewing, and annotation capabilities",
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
      "Audio file support with playback and transcription capabilities.",
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
    contemporaries: []
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
    contemporaries: []
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
    contemporaries: []
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
    label: "Clip from desktop",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.1,
    isPlanned: true,
    description:
      "Desktop screen clipping and snipping tools for capturing any content on your computer when the app is not active",
    contemporaries: []
  },
  {
    label: "Kindle highlights",
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
    contemporaries: []
  },
  {
    label: "Nodularity",
    category: MemotronFeatureCategory.Curation,
    progress: 0.8,
    isNovel: true,
    description:
      "Ability to associate new information to an exact location in a markdown node i.e. headings and sub headings.",
    contemporaries: []
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
    contemporaries: []
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
    contemporaries: []
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
    contemporaries: []
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
      }
    ]
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
