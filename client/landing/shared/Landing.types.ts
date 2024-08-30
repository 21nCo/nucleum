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

export type IItem = {
  icon: string;
  title: string;
  description: string;
};
