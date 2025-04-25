export type ITopNavBar = {
  title?: string;
  icon: string;
  items: { label: string; href: string }[];
  cta?: { label: string; href: string };
};

export type IHeroBtn1 = {
  label: string;
  iosDownloadUrl: string;
  androidDownloadUrl: string;
};

export type IHeroBtn2 = {
  label: string;
  macDownloadUrl: string;
  windowsDownloadUrl: string;
  icon: string;
};
export type IHeroInputs = {
  tagline: string;
  description?: string;
  btn1?: IHeroBtn1;
  btn2?: IHeroBtn2;
  earlyAccessUrl?: string;
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
};

export type IHighlight = {
  icon: string;
  title: string;
  desc: string;
  visualRenderComponent: string;
  isVisualAtBottom?: boolean;
};

export type IFeature = {
  feature: string;
  title: string;
  desc: string;
  visualRenderComponent: string;
};

export type ITestimonial = {
  name: string;
  body: string;
  source: string;
};
