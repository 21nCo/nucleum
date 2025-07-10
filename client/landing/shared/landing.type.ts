export type ITopNavBar = {
  title?: string;
  icon: string;
  items: ITopNavBarItem[];
  cta?: IButton[];
};

export type ITopNavBarItem = {
  label: string;
  href: string;
  expandRender?: string;
};

export type IHeroInputs = {
  tagline: string;
  description?: string;
  primaryButton?: IButton;
  secondaryButton?: IButton;
  earlyAccessUrl?: string;
  availabilityString?: string;
};

export type IGridItem = {
  icon: string;
  title: string;
  description: string;
  href: string;
};

export type ITileItem = {
  icon?: string;
  image?: string;
  title: string;
  label?: string;
  description?: string;
  href?: string;
};

export type IListItem = {
  title: string;
  href?: string;
  icon?: string;
};

export enum PanelName {
  PRODUCTS = "Products",
  BUILT_AT_BLANK_COOP = "Built at 21n"
}

export type IFooter = {
  appStoreUrl?: string;
  helpUrl?: string;
  docsUrl?: string;
  roadmapUrl?: string;
  changelogUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  discordUrl?: string;
  linkedinUrl?: string;
  gitUrl?: string;
};

export type IHighlight = {
  icon: string;
  title: string;
  desc: string;
  visualRenderComponent?: string;
  isVisualAtBottom?: boolean;
  isJustifyEndOnCw?: boolean;
};

export type IFeature = {
  image: string;
  feature: string;
  title: string;
  desc: string;
  visualRenderComponent: string;
  tutorialUrl?: string;
};

export type ITestimonial = {
  name: string;
  body: string;
  source: string;
  link?: string;
};

export type IFaq = {
  title: string;
  body: string;
};

export type IButton = {
  type: "primary" | "secondary";
  isDownloadButton?: boolean;
  label?: string;
  href?: string;
  icon?: string;
};

export type ILandingStoreSubject = {
  isProductsPanelOpen?: boolean;
  isProductPage?: boolean;
  urls: ILandingProductUrls;
};

export type ILandingProductUrls = {
  web?: string;
  features?: string;
  tutorials?: string;
  faqs?: string;
  changelog?: string;
  roadmap?: string;
  downloads?: {
    all?: string;
    windows?: string;
    ios?: string;
    android?: string;
    extension?: string;
  };
  socials?: {
    twitter?: string;
    reddit?: string;
  };
};
