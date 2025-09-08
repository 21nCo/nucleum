import {
  SourcingType,
  type IContemporary,
  type IFwCategory,
  type IFwFeature
} from "$lib/client/types/featureWheel.type";
import {
  getContemporaries,
  getContemporariesForFeature
} from "$lib/client/cx/contemporaries/loader";
import { Contemporary } from "$lib/client/components/featureWheel/comparer.type";

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

const memotronContemporaries: Contemporary[] = [
  Contemporary.Obsidian,
  Contemporary.Notion,
  Contemporary.Capacities,
  Contemporary.Logseq,
  Contemporary.Mymind,
  Contemporary.Raindrop
  // Contemporary.Liner,
  // Contemporary.WeavaHighlighter,
  // Contemporary.Diigo,
  // Contemporary.Glasp,
  // Contemporary.Hypothesis
];

export const contemporaries: IContemporary[] = getContemporaries(
  memotronContemporaries
);

export const features: IFwFeature[] = [
  // App features
  {
    label: "Source",
    slug: "source",
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
        slug: "open-source",
        icon: "ph:code-light"
      },
      {
        label: "Contributions from community are welcome",
        slug: "community-contributions",
        icon: "sparkle"
      },
      {
        label: "Transparent development process and regular public updates",
        slug: "transparent-development",
        icon: "show"
      }
    ],
    comparisionProperties: ["sourcingType"],
    notes:
      "To start with, Memotron is fully open source. Not just the source code, we have our entire roadmap and development process transparent to the community. We are currently working on improving the workflow for contributing to the app from our open source community."
  },
  {
    label: "Privacy & ownership",
    slug: "privacy",
    shortLabel: "Privacy",
    category: MemotronFeatureCategory.App,
    progress: 0.9,
    notes:
      "User privacy and data ownership is at the core of how we do business. You can learn more about our core principles here: [papers.21n.org/soft](https://papers.21n.org/soft).",
    description:
      "Alignment with users' values regarding privacy, security, and ownership of their data.",
    ratingCriteria: [
      { label: "Offline-first approach", slug: "offline" },
      { label: "End-to-end encryption for cloud sync", slug: "e2ee" },
      { label: "Has a bug bounty program", slug: "bug-bounty" },
      {
        label: "Does not sell user data for external use by other companies",
        slug: "data-selling"
      },
      {
        label: "Consent for email collection & promotional email",
        slug: "email-consent"
      },
      { label: "Lower spam rate for promotional emails", slug: "spam-rate" },
      {
        label: "Consent for anonymous usage data collection",
        slug: "anonymous-data-collection"
      },
      { label: "Zero tolerance for misuse of user data", slug: "misuse" }
    ]
  },
  {
    label: "Reliability",
    slug: "reliability",
    category: MemotronFeatureCategory.App,
    progress: 0.5,
    notes:
      "We have a publicly published [status page](https://status.21n.org/) from the get-go and the historical uptime stands good at > 99%. We are committed to providing extremely reliable app. We are still working on this aspect and will be improving it in the upcoming releases.Thanks for your continued support.",
    description:
      "The ability to rely on the app to work as expected without worrying about anything. The *This just works* experience.",
    ratingCriteria: [
      { label: "Zero day one bugs", slug: "bug-free" },
      {
        label: "> 99% uptime & transparent status page",
        slug: "uptime"
      },
      { label: "Mission critical performance", slug: "performance" },
      { label: "No data loss or corruption", slug: "sync-reliability" },
      {
        label: "No crashes or other reliability issues",
        slug: "crash-free"
      },
      { label: "Platform stability", slug: "platform-stability" }
    ]
  },
  {
    label: "Setup & maintenance",
    slug: "maintenance",
    shortLabel: "Maintenance",
    category: MemotronFeatureCategory.App,
    progress: 0.8,
    notes:
      "Setting up Memotron for use is extremely easy as there is almost no setup required. You can start using it right away.",
    description:
      "The ability to set up and maintain the app with minimal friction, time, and effort",
    ratingCriteria: [
      { label: "Easy installation and first use", slug: "setup-ease" },
      { label: "Easy configuration and setup", slug: "learning-curve" },
      { label: "Minimal maintenance required", slug: "maintenance" },
      { label: "Minimal friction in usage", slug: "friction" }
    ]
  },
  {
    label: "Support",
    category: MemotronFeatureCategory.App,
    progress: 0.5,
    isPlanned: true,
    description:
      "The ability to get help and support when needed. The *I can get help when I need it* experience.",
    ratingCriteria: [
      { label: "Email or chat support", slug: "email-support" },
      { label: "Community support", slug: "community-support" },
      { label: "Documentation", slug: "documentation" },
      { label: "Tutorials", slug: "tutorials" }
    ]
  },
  {
    label: "Accessibility",
    category: MemotronFeatureCategory.App,
    progress: 0.5,
    isPlanned: true,
    description:
      "Inclusive design supporting various accessibility needs. We appreciate the thoroughness of Apple's accessibility guidelines. Therefore, we are following them as closely as possible.",
    ratingCriteria: [
      {
        label: "Follow Apple's accessibility guidelines.",
        slug: "accessibility"
      },
      { label: "Compatibility maintenance", slug: "compatibility-maintenance" }
    ]
  },
  {
    label: "Sustainability",
    slug: "sustainability",
    category: MemotronFeatureCategory.App,
    progress: 0.5,
    notes:
      "We are not here to exit. We are here to last. Read our entire philosophy here: [papers.21n.org/soft](https://papers.21n.org/soft). While our code is open-source, we are still working on self-hosting and interoperability with other apps.",
    description:
      "Viable long-term business model ensuring the app's continued existence along with strong controls on data reuse.",
    ratingCriteria: [
      { label: "Viable long-term business model", slug: "business-model" },
      {
        label:
          "Ability to self-host on user's private cloud. (Note: this is different from the availability of full offline version of the app)",
        slug: "self-hosting"
      },
      {
        label:
          "Interoperability with other apps - Integration with other apps and services through APIs, plugins, and robust import/export capabilities",
        slug: "data-portability"
      },
      { label: "Strong export capabilities", slug: "export-capabilities" },
      { label: "Financial stability", slug: "financial-stability" },
      { label: "Low vendor lock-in", slug: "vendor-lock-in" }
    ]
  },
  {
    label: "Offlinability",
    slug: "offlinability",
    category: MemotronFeatureCategory.App,
    progress: 0.9,
    description:
      "Fully functional offline version with local-first data storage and synchronization when online if user opts for it.",
    ratingCriteria: [
      { label: "Fully functional offline version", slug: "offline-version" },
      { label: "Local-first data storage", slug: "local-storage" },
      { label: "Synchronization when online", slug: "sync-when-online" }
    ]
  },
  {
    label: "Humane by design",
    slug: "humane-design",
    category: MemotronFeatureCategory.App,
    progress: 0.9,
    isPlanned: true,
    description:
      "Ethical design principles and practices that guide the app's development and decision-making.",
    ratingCriteria: [
      { label: "Zero dark patterns", slug: "zero-dark-patterns" },
      {
        label: "Transparency",
        slug: "transparency"
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
      "Voice commands and dictation for hands-free interaction with your knowledge base"
  },

  // Content features
  {
    label: "Basic markdown",
    slug: "basic-markdown",
    category: MemotronFeatureCategory.Content,
    progress: 0.75,
    isProminent: true,
    description:
      "Support for standard Markdown syntax for rich text formatting and structuring. Note: This doesn't include advanced features like embeds, tables, etc.",
    ratingCriteria: [
      {
        label: "Support for markdown syntax to create and alter blocks",
        slug: "editor-support"
      },
      {
        label: "Support for inline formatting using escape shortcuts",
        slug: "syntax-support"
      },
      {
        label: "Markdown rendering capabilities",
        slug: "rendering"
      },
      {
        label: "Import/export markdown compatibility",
        slug: "import-export"
      }
    ]
  },
  {
    label: "Advanced Md",
    slug: "advanced-markdown",
    category: MemotronFeatureCategory.Content,
    progress: 0.3,
    isPlanned: true,
    isNovel: true,
    description:
      "Extended Markdown features including custom blocks, embeds, and interactive elements",
    ratingCriteria: [
      {
        label: "Support for layout blocks like tables",
        slug: "layout-blocks"
      },
      {
        label: "Support for embeds",
        slug: "embeds"
      }
    ]
  },
  {
    label: "Pdf",
    slug: "pdf",
    category: MemotronFeatureCategory.Content,
    progress: 0.8,
    description: "Native PDF viewing, and annotation capabilities",
    ratingCriteria: [
      {
        label: "Native PDF viewing",
        slug: "native-pdf-viewing"
      },
      {
        label: "Annotation capabilities",
        slug: "annotation-capabilities"
      }
    ]
  },
  {
    label: "Audio",
    slug: "audio",
    category: MemotronFeatureCategory.Content,
    progress: 0.75,
    description:
      "Audio file support with playback and transcription capabilities.",
    ratingCriteria: [
      {
        label: "Native audio playback.",
        slug: "audio-playback"
      },
      {
        label:
          "Transcription capabilities with an option to transcribe the audio locally without any additional AI credits or plans.",
        slug: "local-transcription"
      },
      {
        label:
          "Transcription with timestamping and text auto conversion to markdown.",
        slug: "timestamping"
      }
    ]
  },
  {
    label: "AI editing and processing",
    category: MemotronFeatureCategory.Content,
    progress: 0.7,
    isPlanned: true,
    description:
      "AI assisted content creation and ideation with state-of-the-art language models"
  },
  {
    label: "Version control",
    slug: "version-control",
    category: MemotronFeatureCategory.Content,
    progress: 0,
    isPlanned: true,
    description:
      "Ability to track and visualize the evolution of content over time",
    ratingCriteria: [
      {
        label: "Ability to see history",
        slug: "history-view"
      },
      {
        label: "Ability to mark versions in history, rollback, duplicate etc",
        slug: "version-management"
      },
      {
        label: "Ability to fork content and have variants of content",
        slug: "content-forking"
      }
    ]
  },
  {
    label: "Comments",
    slug: "comments",
    category: MemotronFeatureCategory.Content,
    progress: 0,
    isPlanned: true,
    description: "Ability to comment on content",
    ratingCriteria: [
      {
        label: "Ability to comment on content",
        slug: "commenting"
      }
    ]
  },
  {
    label: "Metadata",
    slug: "metadata",
    category: MemotronFeatureCategory.Content,
    progress: 0,
    isPlanned: true,
    description:
      "Rich metadata support for content organization, tagging, and property-based filtering",
    ratingCriteria: [
      {
        label:
          "Rich metadata especially for media nodes like images, audio, etc",
        slug: "rich-metadata"
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
      "Quick and frictionless information capture from any context and device."
  },
  {
    label: "Text capture",
    slug: "text-capture",
    icon: "textcapture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.8,
    description:
      "Ability to quickly capture text. This is different from text or web clipping. The text capture is the ability to capture text information in a standalone manner like using markdown editor or textbox.",
    ratingCriteria: [
      {
        label:
          "Quick and frictionless capture of text. Should take minimal number of interactions to start typing in the text after opening the app.",
        slug: "quick-text-capture"
      },
      {
        label: "Support to upload text files.",
        slug: "text-file-upload"
      }
    ]
  },
  {
    label: "Camera capture",
    slug: "camera-capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.8,
    description:
      "Quickly capturing image or video using the camera of user's device.",
    ratingCriteria: [
      {
        label: "Quick and frictionless capture using native device camera.",
        slug: "quick-camera-capture"
      },
      {
        label:
          "Should take minimal number of interactions to start capturing using camera.",
        slug: "minimal-camera-interactions"
      },
      {
        label: "Support to upload images and videos.",
        slug: "media-upload"
      }
    ]
  },
  {
    label: "Audio capture",
    slug: "audio-capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.8,
    description:
      "Ability to quickly capture information using voice recording which can be played back or downloaded in the app later.",
    ratingCriteria: [
      {
        label: "Quick and frictionless audio capture.",
        slug: "quick-audio-capture"
      },
      {
        label:
          "Should take minimal number of interactions to start capturing using audio recorder.",
        slug: "minimal-audio-interactions"
      },
      {
        label: "Native audio recording support with clear UI and controls.",
        slug: "native-audio-recording"
      },
      {
        label: "Upload audio files.",
        slug: "audio-file-upload"
      }
    ]
  },
  {
    label: "Type capture",
    slug: "type-capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0.8,
    isNovel: true,
    description:
      "Capturing new information using types which enables capturing of properties, adding to the collection while capturing. Note: this is different from having types/databases in the app.",
    ratingCriteria: [
      {
        label:
          "Quick and frictionless capture of a type i.e. setting properties for the newly captured information.",
        slug: "quick-type-capture"
      },
      {
        label:
          "Should take minimal number of interactions to start capturing a type.",
        slug: "minimal-type-interactions"
      },
      {
        label:
          "Ability to capture properties of various types like rating, date, single/multi select, etc.",
        slug: "property-types"
      }
    ]
  },
  {
    label: "Sketch capture",
    category: MemotronFeatureCategory.Capture,
    progress: 0,
    isPlanned: true,
    description: "Ability to quickly capture thoughts or ideas using sketching."
  },

  // Clipping features
  {
    label: "Clip from web",
    slug: "web-clipping",
    icon: "webclip",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.8,
    description:
      "Web content clipping with browser extensions and mobile apps for saving articles and pages",
    ratingCriteria: [
      {
        label: "Quick and frictionless saving of any web page",
        slug: "quick-webpage-save"
      },
      {
        label: "Ability to highlight and save text from any web page",
        slug: "text-highlighting"
      },
      {
        label:
          "Ability to have text highlights persisted on the web page when returning to the page",
        slug: "persistent-highlights"
      },
      {
        label:
          "Ability to view all the highlights made on a web page and the ability to scroll to that part of the page upon clicking",
        slug: "highlight-navigation"
      },
      {
        label: "Ability to screenshot on a web page",
        slug: "web-screenshot"
      },
      {
        label:
          "Ability to add additional notes to the web page or the highlights",
        slug: "web-notes"
      }
    ]
  },
  {
    label: "Video clipping",
    slug: "video-clipping",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.75,
    description:
      "YouTube video clipping with timestamp marking and transcription capabilities",
    notes:
      "Memotron offers a comprehensive video clipping experience that allows users to highlight points in the video and save them on all popular video and learning platforms like Youtube, Vimeo, Udemy, etc. \n \n Supported platforms: \n - Youtube \n - Vimeo \n - Udemy \n - Coursera \n - Skillshare",
    ratingCriteria: [
      {
        label:
          "Ability to highlight points in the video and save them on all popular video and learning platforms like Youtube, Vimeo, Udemy, etc",
        slug: "video-platform-highlights"
      },
      {
        label: "Quick and frictionless saving of any YouTube video link",
        slug: "quick-video-save"
      },
      {
        label: "Ability to add additional notes to the video",
        slug: "video-notes"
      },
      {
        label:
          "Ability to view the list of highlights made on the video and jump to that part of the video upon clicking",
        slug: "video-highlight-navigation"
      },
      {
        label:
          "First class viewing support for saved youtube videos and timestamps.",
        slug: "video-viewing-support"
      }
    ]
  },
  {
    label: "Social clipping",
    slug: "social-clipping",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.75,
    description:
      "Clipping posts across regularly used social media platforms like Twitter, Reddit, Facebook, and LinkedIn.",
    notes:
      "Memotron has first-class support for social clipping. Memotron supports clipping from home page timeline, individual post page, clipping from replies and individual profile page for all the below platforms. \n \n __Supported platforms:__ \n - Twitter \n - Reddit \n - Bluesky \n - LinkedIn \n - Threads \n - Facebook \n - Instagram",
    ratingCriteria: [
      {
        label:
          "Ability to save posts from popular social media platforms like Twitter, Reddit, Facebook, and LinkedIn in a quick and frictionless manner.",
        slug: "social-platform-save"
      },
      {
        label: "Ability to add additional notes to the clipped items.",
        slug: "social-notes"
      },
      {
        label: "First class viewing support for saved posts.",
        slug: "social-viewing-support"
      },
      {
        label:
          "Capture posts more efficiently from home page or replies section without the need to open a post page just to clip.",
        slug: "efficient-social-capture"
      }
    ]
  },
  {
    label: "Clip from mobile",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.1,
    isPlanned: true,
    description:
      "Mobile-optimized clipping experience for capturing content on smartphones and tablets"
  },
  {
    label: "Clip from desktop",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.1,
    isPlanned: true,
    description:
      "Desktop screen clipping and snipping tools for capturing any content on your computer when the app is not active"
  },
  {
    label: "Kindle sync",
    slug: "kindle-sync",
    category: MemotronFeatureCategory.Clipping,
    progress: 0.8,
    description:
      "Import and organization of Kindle highlights and notes with book metadata",
    ratingCriteria: [
      {
        label: "Ability to import highlights and notes from Kindle.",
        slug: "kindle-import"
      },
      {
        label: "Ability to add additional notes to the highlights.",
        slug: "kindle-notes"
      }
    ]
  },
  {
    label: "Audio clipping",
    category: MemotronFeatureCategory.Clipping,
    progress: 0,
    isPlanned: true,
    isHideForComparer: true,
    description:
      "Capture and organization of highlights from podcast and music content on popular platforms like Spotify, Apple Music, and SoundCloud. Import and organization of Audible highlights and notes with audiobook metadata",
    ratingCriteria: [
      {
        label: "Integration with Audible",
        slug: "audible-integration"
      },
      {
        label: "Import and organization of Audible highlights and notes",
        slug: "audible-import"
      },
      {
        label:
          "Support clipping on platforms like Audible, Spotify, Scribd, and more",
        slug: "audio-platform-support"
      }
    ]
  },

  // Curation features
  {
    label: "Link to curate",
    slug: "link-to-curate",
    category: MemotronFeatureCategory.Curation,
    progress: 0.8,
    isNovel: true,
    description:
      "Ability to curate new information at source by simply linking to the the destination of the information",
    ratingCriteria: [
      {
        label:
          "Ability to quickly add tags or assign to a collection when clipping from web or from other apps on mobile.",
        slug: "tag-collection-assignment"
      },
      {
        label:
          "Ability to link new information to previosly saved information (entries) on the app.",
        slug: "information-linking"
      }
    ]
  },
  {
    label: "Nodularity",
    slug: "nodularity",
    category: MemotronFeatureCategory.Curation,
    progress: 0.8,
    isNovel: true,
    description: "Granularity in long form content like markdown.",
    ratingCriteria: [
      {
        label:
          "Ability to associate new information to an exact location in a markdown node i.e. headings and sub headings.",
        slug: "location-association"
      },
      {
        label:
          "Ability to search and view exact sub parts of markdown instead of opening the full content.",
        slug: "subpart-search"
      },
      {
        label:
          "Ability to focus or zoom into a sub part of the markdown content.",
        slug: "content-focusing"
      },
      {
        label:
          "Ability to link / reference or mention sub parts of the markdown content in another markdown or nodes with ease.",
        slug: "subpart-referencing"
      }
    ]
  },
  {
    label: "Collections/tags",
    slug: "collections",
    icon: "collection",
    category: MemotronFeatureCategory.Curation,
    progress: 0.8,
    isNovel: true,
    description: "Ability to collect information into simple collections/tags"
  },
  {
    label: "Types/Objects",
    slug: "types",
    icon: "type",
    category: MemotronFeatureCategory.Curation,
    learnMoreLink: "https://docs.memotron.app/memotron/types",
    progress: 0.75,
    description:
      "Structured data with custom avatars, properties, and relations for organized knowledge",
    ratingCriteria: [
      {
        label:
          "Ability to create objects/types with a title, avatar and properties",
        slug: "type-creation"
      },
      {
        label:
          "Ability to have variety of property types to save and organize information including but not limited to text, number, date, rating, select, checkbox, etc.",
        slug: "property-variety"
      }
    ]
  },
  {
    label: "Backlinking",
    slug: "backlinking",
    category: MemotronFeatureCategory.Curation,
    progress: 0.75,
    description:
      "Automatic and manual backlink creation to discover connections between content pieces",
    ratingCriteria: [
      {
        label: "Ability to create and view backlinks to other nodes.",
        slug: "backlink-creation"
      }
    ]
  },
  {
    label: "Query",
    slug: "query",
    category: MemotronFeatureCategory.Curation,
    progress: 0,
    isPlanned: true,
    description:
      "Advanced query language for filtering and aggregating content based on properties and content"
  },
  {
    label: "Link suggestions",
    category: MemotronFeatureCategory.Curation,
    progress: 0,
    isPlanned: true,
    isNovel: true,
    description:
      "AI-suggested connections between content based on semantic similarity and relationships"
  },

  // Views features
  {
    label: "Calendar",
    slug: "calendar",
    category: MemotronFeatureCategory.Views,
    progress: 0.75,
    isNovel: true,
    description:
      "Time-based visualization of content with chronological organization capabilities",
    ratingCriteria: [
      {
        label: "Ability to take notes for a specific date.",
        slug: "date-notes"
      },
      {
        label:
          "Ability to take notes on higher time periods like month, year etc for planning and retrospection purposes.",
        slug: "period-notes"
      },
      {
        label:
          "Ability to view information captured or clipped on a particular day.",
        slug: "daily-view"
      },
      {
        label:
          "Ability to switch between time scales like day, week, month, year to gain better perspective.",
        slug: "time-scale-switching"
      },
      {
        label:
          "Retrospection feature by connecting dots with similar days years ago, high level overview etc",
        slug: "retrospection"
      }
      // {
      //   label:
      //     "Ability to view time periods like days, weeks, months etc as stacked columns for easy planning"
      // }
      // {
      //   label: "Ability to view heatmap of activity for easier retrospection"
      // }
    ]
  },
  {
    label: "Graph view",
    slug: "graph-view",
    category: MemotronFeatureCategory.Views,
    progress: 0.75,
    description:
      "Graph view for visual organization of entire knowledge base. Note: This is different from local graph of a particular node in question.",
    ratingCriteria: [
      {
        label: "Ability to view the entire knowledge base as a graph.",
        slug: "knowledge-graph"
      }
    ]
  },
  {
    label: "Bird view",
    slug: "bird-view",
    category: MemotronFeatureCategory.Views,
    progress: 0.75,
    isNovel: true,
    description: "High-level overview for a local node",
    ratingCriteria: [
      {
        label:
          "Ability to view all the connected links for a local node visually on a high level.",
        slug: "local-node-overview"
      }
    ]
  },
  {
    label: "Board view",
    slug: "board-view",
    category: MemotronFeatureCategory.Views,
    progress: 0.75,
    description:
      "Kanban-style board view for visual organization and workflow management",
    ratingCriteria: [
      {
        label: "Ability to create and view boards",
        slug: "board-management"
      },
      {
        label: "Ability to add cards to the board",
        slug: "card-management"
      }
    ]
  },
  {
    label: "Table",
    slug: "table",
    category: MemotronFeatureCategory.Views,
    progress: 0.15,
    isPlanned: true,
    description:
      "Structured table view with sorting, filtering, and customizable columns"
  },
  {
    label: "Combination",
    slug: "combination",
    category: MemotronFeatureCategory.Views,
    progress: 0.15,
    isPlanned: true,
    description:
      "Customizable combination of different view types for flexible information display"
  },

  // Retrieval and synthesis features
  {
    label: "Search",
    slug: "search",
    category: MemotronFeatureCategory.RetrievalAndSynthesis,
    progress: 0.8,
    description: "Search for content in the knowledge base",
    ratingCriteria: [
      {
        label: "Basic keyword based search",
        slug: "keyword-search"
      },
      {
        label:
          "Fuzzy search (to support spelling mistakes, partial words, etc)",
        slug: "fuzzy-search"
      },
      {
        label: "Operators to refine search results",
        slug: "search-operators"
      },
      {
        label:
          "Extremely performant search even with large volume data (50,000+ records)",
        slug: "performant-search"
      },
      {
        label:
          "Support to search in audio transcriptions and images (if audio and images are available)",
        slug: "multimedia-search"
      },
      {
        label:
          "Search ranking, weight tuning and great relevancy in search results.",
        slug: "search-relevancy"
      },
      {
        label:
          "Web text, Pdf, Kindle highlights all should be supported in search (if these types of data is supported by the app)",
        slug: "content-type-search"
      }
    ]
  },
  {
    label: "Semantic search",
    slug: "semantic-search",
    category: MemotronFeatureCategory.RetrievalAndSynthesis,
    progress: 0,
    isPlanned: true,
    description:
      "Concept and meaning-based search powered by advanced embedding models. Natural language search capabilities for finding content using conversational queries"
  },
  {
    label: "Summarizer",
    slug: "summarizer",
    category: MemotronFeatureCategory.RetrievalAndSynthesis,
    progress: 0,
    isPlanned: true,
    isNovel: true,
    description:
      "Automatic generation of summaries for long-form content and collections of notes"
  },
  {
    label: "Serendipity",
    slug: "serendipity",
    category: MemotronFeatureCategory.RetrievalAndSynthesis,
    progress: 0,
    isPlanned: true,
    description:
      "Intelligent discovery of relevant but unexpected connections in your knowledge base"
  },
  {
    label: "Time machine",
    category: MemotronFeatureCategory.RetrievalAndSynthesis,
    progress: 0,
    isPlanned: true,
    isNovel: true,
    description:
      "Advanced time-travel functionality to view and interact with your knowledge base at any point in time"
  },
  {
    label: "Public API",
    slug: "public-api",
    category: MemotronFeatureCategory.RetrievalAndSynthesis,
    progress: 0.5,
    isPlanned: true,
    description:
      "API integration with external platforms for data exchange and automation"
  },
  {
    label: "MCP server",
    category: MemotronFeatureCategory.RetrievalAndSynthesis,
    progress: 0,
    isPlanned: true,
    description:
      "MCP server to support retrieval and synthesis of knowledge via AI agents"
  },
  {
    label: "Flash cards",
    slug: "flash-cards",
    category: MemotronFeatureCategory.RetrievalAndSynthesis,
    progress: 0.25,
    isPlanned: true,
    description:
      "Spaced repetition and flashcard system for learning and memorization of important knowledge"
  }
].map((feature) => {
  if (feature.slug) {
    const contemporariesForFeature = getContemporariesForFeature(
      feature.slug,
      memotronContemporaries
    );
    if (feature.slug === "source") {
      const closedSourceContemporaries = contemporaries
        .filter(
          (c) => !c.sourcingType || c.sourcingType === SourcingType.CLOSED
        )
        .filter(
          (c) => !contemporariesForFeature.some((f) => f.label === c.label)
        )
        .map((c) => ({ label: c.label, value: 0 }));

      return {
        ...feature,
        contemporaries: [
          ...contemporariesForFeature,
          ...closedSourceContemporaries
        ]
      };
    }

    return {
      ...feature,
      contemporaries: contemporariesForFeature
    };
  }

  return {
    ...feature,
    contemporaries: []
  };
});
