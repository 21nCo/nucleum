import { SITE } from "$env/static/private";
import type {
  IFeature,
  IHeroInputs,
  IHighlight,
  ITestimonial
} from "../shared/landing.type";
import { highlights } from "../shared/highlights/highlights.data";
import { staticUrl } from "../shared/store/shared.store";
import type { ISEOMetadata } from "../shared/seo/seo.type";

const orgName = "Phinative soft private limtied (21n)";

function resolveBaseProductStructuredData(product: string) {
  return {
    "@type": "SoftwareApplication",
    alternativeName: product,
    applicationCategory: "ProductivityApplication",
    operatingSystem: ["IOS", "MAC", "WINDOWS"],
    offers: [
      {
        "@type": "Offer",
        price: 0,
        priceCurrency: "USD",
        name: "Offline & free forever",
        description: "Core features available with offline support"
      },
      {
        "@type": "Offer",
        price: 7,
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "PriceSpecification",
          price: 7,
          priceCurrency: "USD",
          billingDuration: "P1M"
        },
        name: `${product} Sync Monthly`,
        description: "Cloud sync across devices - monthly plan"
      },
      {
        "@type": "Offer",
        price: 60,
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "PriceSpecification",
          price: 60,
          priceCurrency: "USD",
          billingDuration: "P1Y"
        },
        name: `${product} Sync Yearly`,
        description: "Cloud sync across devices - yearly plan"
      },
      {
        "@type": "Offer",
        price: 15,
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "PriceSpecification",
          price: 15,
          priceCurrency: "USD",
          billingDuration: "P1M"
        },
        name: `${product} Nucleus Monthly`,
        description: "Premium features with advanced analytics and management"
      },
      {
        "@type": "Offer",
        price: 143.99,
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "PriceSpecification",
          price: 143.99,
          priceCurrency: "USD",
          billingDuration: "P1Y"
        },
        name: `${product} Nucleus Yearly`,
        description:
          "Premium features with advanced analytics and management - yearly plan"
      }
    ]
  };
}

function resolveCommonProductStructuredData(product: string) {
  return {
    ...resolveBaseProductStructuredData(product),
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    author: {
      "@type": "Organization",
      name: orgName,
      url: "https://21n.org"
    },
    publisher: {
      "@type": "Organization",
      name: orgName,
      url: "https://21n.org"
    },
    inLanguage: "en",
    copyrightHolder: {
      "@type": "Organization",
      name: orgName
    },
    license: "Open Source",
    requirements:
      "iOS 15.0 or later, iPadOS 15.0 or later, macOS 14.1 or later, visionOS 1.0 or later for Apple devices. Android and web versions available."
  };
}

const products = [
  {
    ...resolveBaseProductStructuredData("Memotron"),
    "@type": "SoftwareApplication",
    name: "Memotron",
    url: "https://memotron.app"
  },
  {
    ...resolveBaseProductStructuredData("Pointron"),
    "@type": "SoftwareApplication",
    name: "Pointron",
    url: "https://pointron.app"
  }
];

let nMetadata: ISEOMetadata = {
  title: "21n - 21st century native organization",
  description:
    "21st century native organization. Building impressive products with triple bottom line at our core.",
  keywords: ["21n", "21st century native organization", "triple bottom line"],
  canonicalUrl: "https://21n.org",
  ogImage: "https://cdn.21n.co/21n/ogImage.png",
  structuredData: [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "21n",
      description:
        "21st century native organization. Building impressive products with triple bottom line at our core.",
      url: "https://21n.org"
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "21n",
      legalName: orgName,
      alternateName: ["21st century native org", "Phinative"],
      description:
        "21st century native organization! We are a software development company specializing in personal knowledge management applications, productivity tools, and open source software solutions.",
      url: "https://21n.org",
      sameAs: [
        "https://www.linkedin.com/company/21n",
        "https://memotron.app",
        "https://pointron.app"
      ],
      logo: "https://21n.org/logo.png",
      image: "https://cdn.21n.co/21n/ogImage.png",
      foundingDate: "2021-10-26",
      foundingLocation: {
        "@type": "Place",
        name: "Hyderabad, Telangana, India"
      },
      address: {
        "@type": "PostalAddress",
        streetAddress: "Pent house, Plot 492",
        addressLocality: "Hyderabad",
        addressRegion: "Telangana",
        postalCode: "500085",
        addressCountry: "IN"
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        areaServed: "Worldwide",
        availableLanguage: "English"
      },
      founder: [
        {
          "@type": "Person",
          name: "Aravind S",
          jobTitle: "Director"
        }
      ],
      numberOfEmployees: {
        "@type": "QuantitativeValue",
        minValue: 2,
        maxValue: 10
      },
      industry: "Software Development",
      naics: "541511",
      isicV4: "6201",
      keywords:
        "software development, personal knowledge management, PKM, productivity apps, open source, web applications, mobile apps, focus tracking, time management",
      knowsAbout: [
        "Personal Knowledge Management",
        "Productivity Software",
        "Web Application Development",
        "Mobile App Development",
        "Open Source Software",
        "Time Tracking Applications",
        "Focus Management Tools",
        "Cross-platform Development"
      ],
      makesOffer: [
        ...products.map((product) => ({
          "@type": "Offer",
          itemOffered: product
        })),
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Software Development Services",
            description: "Custom software development and consulting"
          }
        }
      ],
      owns: products,
      parentOrganization: {
        "@type": "Organization",
        name: orgName,
        identifier: {
          "@type": "PropertyValue",
          name: "CIN",
          value: "U62099TS2025PTC197740"
        }
      },
      leiCode: "U62099TS2025PTC197740",
      taxID: "U62099TS2025PTC197740",
      vatID: "36AABCB4751C1ZG",
      duns: "771573132",
      slogan: "21st century native organization!",
      award: ["Open source contributor", "Innovative PKM solutions provider"],
      seeks: {
        "@type": "Demand",
        name: "Software developers and product designers interested in productivity and knowledge management tools"
      },
      hasCredential: [
        {
          "@type": "EducationalOccupationalCredential",
          name: "Private Limited Company Registration",
          credentialCategory: "Business License",
          recognizedBy: {
            "@type": "Organization",
            name: "Ministry of Corporate Affairs, Government of India"
          }
        }
      ],
      memberOf: [
        {
          "@type": "Organization",
          name: "Indian Software Industry",
          description: "Part of India's growing software development ecosystem"
        }
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "21n Software Products and Services",
        itemListElement: [
          ...products.map((product) => ({
            "@type": "Offer",
            itemOffered: product
          }))
        ]
      },
      agentInteractionStatistic: {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/FollowAction",
        userInteractionCount: 3113
      },
      publishingPrinciples: "https://21n.org/privacy",
      diversityPolicy: "https://21n.org/diversity",
      ethicsPolicy: "https://21n.org/ethics",
      correctionsPolicy: "https://21n.org/corrections",
      unnamedSourcesPolicy: "https://21n.org/sources",
      actionableFeedbackPolicy: "https://21n.org/feedback",
      areaServed: {
        "@type": "Place",
        name: "Worldwide"
      }
    }
  ]
};

let nHeroInputs: IHeroInputs = {
  tagline: "21st century native org",
  description: "Pioneering sustainable technology for the modern era"
};

let memotronHeroInputs: IHeroInputs = {
  tagline: "Your memory atlas",
  description:
    "A thoughtfully crafted super app for your personal knowledge management.",
  primaryButton: {
    isDownloadButton: true,
    type: "primary"
  },
  availabilityString: "Available as web, chrome extension, iOS and macOS apps."
};

const memotronHighlights: IHighlight[] = [
  {
    ...highlights.wholesome,
    desc: "Finally, a place where personal knowledge management feels complete.",
    visualRenderComponent: "memotronFeaturesRadial"
  },
  highlights.reliable,
  highlights.offline,
  highlights.zerotrust,
  highlights.ainative,
  highlights.humane,
  highlights.intuitive,
  highlights.laast
];
const mainMemotronVideoUrl = "https://www.youtube.com/watch?v=SeWdndc7y4A";
const memotronTestimonials: ITestimonial[] = [
  {
    name: "CRWM_",
    body: "Wow this sounds super interesting! I like your premise of NCCL it aligns with my goal of what I've been trying to accomplish with testing out various PKMS apps!",
    source: "reddit",
    link: "https://www.reddit.com/r/PKMS/comments/1gov3mq/comment/lwljjqy/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button"
  },
  {
    name: "Raju Penmatsa",
    body: "just came across Memotron (notion alt),  on my yt feed, this is really incredible. connectors could be game changer, especially for my workflows. I really lack a good funnel, which can capture. ",
    source: "twitter",
    link: "https://x.com/iam_rajuptvs/status/1857100041795887608"
  },
  {
    name: "@iamjesushusbands",
    body: "This actually really peaks my interest and I'm a hardcore Notion user",
    source: "youtube",
    link: mainMemotronVideoUrl
  },
  {
    name: "@Yash_Tomar",
    body: "Impressive",
    source: "youtube",
    link: mainMemotronVideoUrl
  },
  {
    name: "@MyDigitalHub",
    body: "Tried using it for 2 days now. Very interesting approach in PKM.",
    source: "youtube",
    link: mainMemotronVideoUrl
  },
  {
    name: "Antone",
    body: "I like the idea of this app and think it can have a great future.",
    source: "youtube",
    link: "https://youtu.be/SmUIsnbahbE?si=TXEQkJGNb2jbiVGu"
  },
  {
    name: "Arka9",
    body: "I really like the concept behind Memotron it's got a lot of potential!",
    source: "discord",
    link: "https://discord.com/channels/831815510563749889/1306169287479922688"
  },
  {
    name: "@elephant999",
    body: "I really like this app",
    source: "youtube",
    link: "https://www.youtube.com/watch?v=SdDRE53zLiM"
  },
  {
    name: "Fylleth666",
    body: "Well the video is mindblowing, excited to test yet another very promising PKM!",
    source: "reddit",
    link: "https://www.reddit.com/r/PKMS/comments/1gov3mq/comment/lwn4xeb/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button"
  },
  {
    name: "BlaqueServant",
    body: "OK, you have my attention with this. I wish it were a bit prettier and flashier, but the functionality seems impressive off the bat.",
    source: "reddit",
    link: "https://www.reddit.com/r/PKMS/comments/1gov3mq/comment/lwyeu9o/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button"
  }
];

const memotronFeatures: IFeature[] = [
  {
    image: "captureFeature.png",
    feature: "Capture",
    title: "Fastest capture ever built",
    desc: "Capture your fleeting thoughts and ideas in any format and from any device. With Memotron, capturing is frictionless - always one interaction away.",
    visualRenderComponent: "captureFeature",
    videoElement: {
      title: "It takes <5 sec to start capturing",
      url: "https://youtu.be/7KHEG8QSv6w"
    }
  },
  {
    image: "clipFeature.png",
    feature: "Clipping",
    title: "Web clipper extension",
    desc: "Clip anything, anywhere with the most intuitive clipping experience using our browser extension.",
    visualRenderComponent: "clipFeature"
  },
  {
    image: "organizeFeature.png",
    feature: "Curation",
    title: "Organize like a breeze",
    desc: "Organizing your knowledge isn't another additional step on Memotron. With our link to curate capability - your notes will auto-organize during capture itself. It gets even better with collections, properties and relations.",
    visualRenderComponent: "organizeFeature"
  },
  {
    image: "synthesizeFeature.png",
    feature: "Synthesize",
    title: "Search, retrieve, and recall",
    desc: "Search from your digital memory at the right moments when you need it the most.",
    visualRenderComponent: "synthesizeFeature"
  }
];

const memotronMetadata: ISEOMetadata = {
  title: "Memotron - Open source personal knowledge management for everyone",
  description:
    "Memotron is a digital notes app that helps user's manage personal knowledge, research and learning.",
  keywords: [
    "memotron",
    "note-taking",
    "digital memory management",
    "knowledge management",
    "PKM",
    "NCCL PKM system"
  ],
  canonicalUrl: "https://memotron.app",
  ogImage: "https://cdn.21n.co/memotron/ogImage.png",
  structuredData: [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Memotron",
      description:
        "Memotron is a digital notes app that helps user's manage personal knowledge, research and learning.",
      url: "https://memotron.app"
    },
    {
      ...resolveCommonProductStructuredData("Memotron"),
      name: "Memotron - Your memory atlas",
      description:
        "Memotron is a digital memory and thinking tool that is unbelievably powerful, insanely reliable, and surprisingly intuitive. Transform the way you think, learn and manage your knowledge using advanced markdown, multi-modal capture, PDF annotation, web clipping, and AI-powered features.",
      url: "https://memotron.app",
      downloadUrl: [
        "https://apps.apple.com/us/app/memotron-your-memory-atlas/id6737236940",
        "https://play.google.com/store/apps/details?id=io.memotron.app.twa",
        "https://apps.microsoft.com/detail/9n3w73wbxb7m"
      ],
      featureList: [
        "Advanced markdown with layout and embed blocks",
        "Multi-modal capture (text, audio, camera, files)",
        "Free local and offline AI transcription",
        "PDF capture and annotation",
        "Web clipper browser extension",
        "Collections, types, masonry, kanban views",
        "Graph view and semantic search",
        "Command bar interface",
        "Open source architecture"
      ],
      softwareVersion: "0.61.2",
      datePublished: "2024-11-10",
      dateModified: "2025-08-24",
      screenshot: [
        "https://memotron.app/screenshots/capture.png",
        "https://memotron.app/screenshots/organize.png",
        "https://memotron.app/screenshots/graph.png"
      ],
      applicationSubCategory: "Personal Knowledge Management",
      keywords:
        "PKM, personal knowledge management, notes, productivity, markdown, web clipper, AI transcription, open source",
      license: "Open Source",
      releaseNotes:
        "Latest version includes performance improvements and bug fixes for enhanced user experience"
    }
  ]
};

let pointronHeroInputs: IHeroInputs = {
  tagline: "Your focus haven",
  description: "Track time, achieve goals and focus like never before.",
  primaryButton: {
    isDownloadButton: true,
    type: "primary"
  },
  availabilityString: "Available on web, iOS and macOS."
};

const pointronHighlights: IHighlight[] = [
  {
    ...highlights.wholesome,
    desc: "Finally, a place where personal focus management feels complete.",
    visualRenderComponent: "pointronFeatures"
  },
  // highlights.reliable,
  {
    ...highlights.powerful,
    desc: "Unlock next-level of focus, time and goal tracking with a powerhouse of features.",
    visualRenderComponent: ""
  },
  highlights.offline,
  highlights.zerotrust,
  highlights.laast,
  highlights.intuitive
];

const pointronTestimonials: ITestimonial[] = [
  {
    name: "TheoxPratham",
    body: "Loved the concept and the work that has been put in it to make it the best focus app.",
    source: "appstore",
    link: "https://apps.apple.com/in/app/pointron-focus-time-tracker/id6469411284?platform=iphone"
  },
  {
    name: "Artak",
    body: "I absolutely love it and use it everyday.",
    source: "discord"
  },
  {
    name: "NellyisDev",
    body: "Pointron is a great app that helps me track my day, understand how I spend my time, and plan to be more efficient so I get more done, faster.",
    source: "discord"
  },
  {
    name: "VirgilCaffier",
    body: "Your time is precious! What's the best way to not waste it? The one I'm currently using is Pointron!",
    source: "twitter",
    link: "https://x.com/VirgilCaffier/status/1661031751387602946"
  }
];

const pointronFeatures: IFeature[] = [
  {
    image: "phone.png",
    feature: "Advanced focus",
    title: "Focus in more powerful ways",
    desc: "Focus the way you work with customisable focus sessions and break reminders.",
    visualRenderComponent: "focusFeature"
  },
  {
    image: "goalsFeature.png",
    feature: "Goals & Tasks",
    title: "Infinite goal nesting, tasks at atomic level",
    desc: "Create and track goals granularly using deep nesting and create tasks on atomic level.",
    visualRenderComponent: "goalsFeature"
  },
  {
    image: "analyticsFeature.png",
    feature: "Calendar, Analytics & more",
    title: "Powerhouse of features",
    desc: "Track your progress using Analytics, calendar and more.",
    visualRenderComponent: "analyticsFeature"
    // tutorialUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }
];

const pointronMetadata: ISEOMetadata = {
  title: "Pointron - Open source focus time tracker for everyone",
  description:
    "Pointron is a focus time tracker that helps user's track their time and achieve goals.",
  keywords: [
    "pointron",
    "focus time tracker",
    "time tracking",
    "goal tracking",
    "productivity",
    "PKM"
  ],
  canonicalUrl: "https://pointron.app",
  ogImage: "https://cdn.21n.co/pointron/ogImage.png",
  structuredData: [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Pointron",
      description:
        "Pointron is a focus time tracker that helps user's track their time and achieve goals.",
      url: "https://pointron.app"
    },
    {
      ...resolveCommonProductStructuredData("Pointron"),
      name: "Pointron - Focus time tracker",
      description:
        "Track time, achieve goals and focus like never before. Pointron is your ultimate productivity sidekick that transforms focusing on tasks and completing projects into an absolute breeze with advanced time tracking, goal management, analytics and calendar features.",
      url: "https://pointron.app",
      downloadUrl: [
        "https://apps.apple.com/us/app/pointron-focus-time-tracker/id6469411284",
        "https://play.google.com/store/apps/details?id=io.pointron.app.twa",
        "https://web.pointron.app"
      ],
      featureList: [
        "Quick focus and advanced focus sessions",
        "Multiple focus methods: Pomodoro, countdown, count-up, end time",
        "Goal and task management with hierarchical structure",
        "Fully customizable analytics dashboard",
        "Collections to organize goals powerfully",
        "Calendar view and integration",
        "Instant search and command bar",
        "Manual logging for missed sessions",
        "Break reminders and notifications",
        "Focus presets for repeated workflows",
        "Multi-platform sync (premium)",
        "Full offline support",
        "Open source architecture"
      ],
      softwareVersion: "0.83.0",
      datePublished: "2023-05-19",
      dateModified: "2025-06-01",
      applicationSubCategory: "Focus and Time Tracking",
      keywords:
        "focus, time tracking, productivity, pomodoro, goal management, task management, analytics, calendar, open source",
      license: "Open Source",
      screenshot: [
        "https://pointron.app/screenshots/focus.png",
        "https://pointron.app/screenshots/analytics.png",
        "https://pointron.app/screenshots/calendar.png"
      ],
      // aggregateRating: {
      //   "@type": "AggregateRating",
      //   ratingValue: 5.0,
      //   ratingCount: 5,
      //   bestRating: 5,
      //   worstRating: 1
      // },
      releaseNotes:
        "Latest version 0.83.0 includes improved app performance and search with fuzzy matching, enhanced calendar functionality, and various UI improvements and bug fixes."
    }
  ]
};

const deviceImages = ["tab.png", "laptop.png", "phone.png"];

export function load() {
  switch (SITE) {
    case "21n":
      return {
        heroInputs: nHeroInputs,
        metadata: nMetadata
      };
    case "Memotron":
      return {
        highlights: memotronHighlights,
        features: memotronFeatures,
        testimonials: memotronTestimonials,
        metadata: memotronMetadata,
        heroInputs: memotronHeroInputs,
        heroVideoFrameUrl:
          staticUrl + "/images/landing/videoFrames/Frame-5.png",
        heroVideoUrl:
          "https://www.youtube.com/embed/SeWdndc7y4A?si=Wa0Kdg22N205iOLJ",
        bottomCtaBody:
          "Start using Memotron to replace scattered workflows with a cohesive memory atlas.",
        featureSection: {
          title: "Your digital notes, at a whole new level",
          body: "Thoughtfully crafted, one feature at a time"
        },
        deviceImages
      };
    case "Pointron":
      return {
        highlights: pointronHighlights,
        features: pointronFeatures,
        testimonials: pointronTestimonials,
        metadata: pointronMetadata,
        heroInputs: pointronHeroInputs,
        heroVideoFrameUrl:
          staticUrl + "/images/landing/videoFrames/Frame-10.png",
        heroVideoUrl:
          "https://www.youtube.com/embed/5lnABLu3YXs?si=u1iuwtfGYBWLraqP",
        bottomCtaBody:
          "Gently guide your time, grow your habits, and reach your goals - at your own pace",
        featureSection: {
          title: "Explore focus in a whole new way",
          body: "Thoughtfully crafted, one feature at a time"
        },
        deviceImages
      };
  }
  return {
    highlights: [],
    features: [],
    testimonials: []
  };
}
