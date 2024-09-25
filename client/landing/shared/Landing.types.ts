export type ITopNavBar = {
  title: string;
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
  title: string;
  label: string;
  btn1?: IHeroBtn1;
  btn2?: IHeroBtn2;
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
};

export enum PanelName {
  PRODUCTS = "Products",
  BUILT_AT_BLANK_COOP = "Built at Blank.coop"
}
