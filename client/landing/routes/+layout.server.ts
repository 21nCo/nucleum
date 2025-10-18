import { IS_PRODUCT_PAGE, SITE } from "$env/static/private";
import type {
  IFooter,
  ILandingProductUrls,
  ITopNavBar
} from "../shared/landing.type";
import { org } from "../shared/store/shared.store";

const nUrls: ILandingProductUrls = {
  socials: {
    twitter: org.twitter
  }
};
const nTopNavBarValues: ITopNavBar = {
  icon: "21n-temp",
  items: [
    {
      label: "Products",
      href: org.docs
    },
    { label: "Discord", href: org.discord },
    { label: "White paper", href: org.whitepaper }
  ],
  cta: [
    {
      label: "Contribute",
      icon: "ph:github-logo",
      href: org.github,
      type: "primary"
    }
  ]
};
let nFooterValues: IFooter = {
  blogUrl: org.blog,
  twitterUrl: nUrls.socials?.twitter
};

const memotronUrls: ILandingProductUrls = {
  web: "https://web.memotron.app",
  features: "https://docs.memotron.app/memotron/features",
  tutorials: org.youtube,
  faqs: "https://docs.memotron.app/memotron/faqs",
  changelog: "https://docs.memotron.app/changelog/memotron/new",
  roadmap: "https://docs.memotron.app/memotron/roadmap",
  downloads: {
    all: "https://docs.memotron.app/memotron/installation",
    ios: "https://apps.apple.com/in/app/memotron-your-memory-atlas/id6737236940",
    extension:
      "https://chromewebstore.google.com/detail/memotron-web-clipper/fgghopffkfdhckbcghodnlbplkagokcn"
  },
  socials: {
    twitter: "https://x.com/memotronApp",
    reddit: "https://www.reddit.com/r/memotron/"
  }
};

const memotronTopNavBarValues: ITopNavBar = {
  icon: "memotron",
  title: "Memotron",
  items: [
    {
      label: "Resources",
      href: "https://docs.memotron.app/",
      expandRender: "resources"
    },
    { label: "Pricing", href: "/pricing" },
    { label: "Compare", href: "/compare" },
    { label: "Extension", href: memotronUrls.downloads?.extension ?? "" },
    { label: "Discord", href: org.discord }
  ],
  cta: [
    {
      label: "",
      href: "https://github.com/21nOrg/tidigit",
      icon: "ph:github-logo",
      type: "secondary"
    },
    {
      label: "Go to web app",
      href: "https://web.memotron.app",
      type: "primary"
    }
  ]
};
let memotronFooterValues: IFooter = {
  appStoreUrl: memotronUrls.downloads?.ios,
  twitterUrl: memotronUrls.socials?.twitter,
  docsUrl: "https://docs.memotron.app",
  youtubeUrl: org.youtube,
  roadmapUrl: memotronUrls.roadmap,
  changelogUrl: memotronUrls.changelog
};

const pointronUrls: ILandingProductUrls = {
  web: "https://web.pointron.app",
  features: "https://docs.pointron.app/pointron/features",
  tutorials: org.youtube,
  faqs: "https://docs.pointron.app/pointron/faqs",
  changelog: "https://docs.pointron.app/changelog/pointron/new",
  roadmap: "https://docs.pointron.app/pointron/roadmap",
  downloads: {
    all: "https://docs.pointron.app/pointron/installation",
    ios: "https://apps.apple.com/in/app/pointron-focus-time-tracker/id6469411284"
  },
  socials: {
    twitter: "https://x.com/pointronApp"
  }
};
let pointronTopNavBarValues: ITopNavBar = {
  icon: "pointron",
  title: "Pointron",
  items: [
    {
      label: "Resources",
      href: "https://docs.pointron.app/",
      expandRender: "resources"
    },
    // { label: "Compare", href: "/compare", expandRender: "compare" },
    { label: "Pricing", href: "/pricing" },
    { label: "Discord", href: org.discord }
  ],
  cta: [
    {
      label: "",
      href: "https://github.com/21nOrg/tidigit",
      icon: "ph:github-logo",
      type: "secondary"
    },
    {
      label: "Go to web app",
      href: "https://web.pointron.app",
      type: "primary"
    }
  ]
};
let pointronFooterValues: IFooter = {
  appStoreUrl: pointronUrls.downloads?.ios,
  twitterUrl: pointronUrls.socials?.twitter,
  docsUrl: "https://docs.pointron.app",
  youtubeUrl: org.youtube,
  roadmapUrl: pointronUrls.roadmap,
  changelogUrl: pointronUrls.changelog
};

function resolveProductData(product: string) {
  switch (product) {
    case "21n":
      return {
        website: "https://21n.org",
        urls: nUrls,
        topNavBarValues: nTopNavBarValues,
        footerValues: nFooterValues
      };
    case "Memotron":
      return {
        website: "https://memotron.app",
        urls: memotronUrls,
        topNavBarValues: memotronTopNavBarValues,
        footerValues: memotronFooterValues
      };
    case "Pointron":
      return {
        website: "https://pointron.app",
        urls: pointronUrls,
        topNavBarValues: pointronTopNavBarValues,
        footerValues: pointronFooterValues
      };
    default:
      return {
        website: "https://21n.org",
        urls: nUrls,
        topNavBarValues: nTopNavBarValues,
        footerValues: nFooterValues
      };
  }
}

export function load() {
  const productData = resolveProductData(SITE);
  return {
    ...productData,
    product: SITE,
    site: SITE,
    isProduct: IS_PRODUCT_PAGE === "true"
  };
}
