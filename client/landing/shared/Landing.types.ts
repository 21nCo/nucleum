export type ITopNavBar = {
  title: string;
  icon: string;
  items: { label: string; href: string }[];
  cta?: { label: string; href: string };
};

export type IHeroInputs = {
  title: string;
  label: string;
};

export type IGridItem = {
  icon: string;
  title: string;
  description: string;
  href: string;
};

export type ITileItem = {
  image?: string;
  title: string;
  description: string;
  href?: string;
};
