import { readable, writable } from "svelte/store";
import type {
  ILandingProductUrls,
  ILandingStoreSubject,
  ITileItem
} from "../landing.type";
import { GlobalEvent } from "$lib/client/types/event.enum";
import { dispatchCustomEvent } from "$lib/client/utils/browser.utils";

export const staticUrl = import.meta.env.VITE_STATIC_URL;
export const companyName = "Phinative soft pvt ltd.";
export const companyAddress = "Hyderabad, India";
export const companyEmail = "contact@21n.org";
export const companyPhone = "+91 9985563939";
export const companyWebsite = "https://21n.org";
export const whitePaperUrl = "https://papers.21n.org/soft";
export const discordUrl = "https://discord.com/invite/9HJqKYTZKg";
export const twitterUrl = "https://x.com/21nOrg";
export const youtubeUrl = "https://www.youtube.com/@21nOrg";

export const currentProductsStore = readable<ITileItem[]>([
  {
    image: staticUrl + "/images/product/pointron-product-image.png",
    title: "Pointron",
    label: "Your focus haven.",
    href: "https://pointron.app"
  },
  {
    image: staticUrl + "/images/product/memotron-product-image.png",
    title: "Memotron",
    label: "Your memory atlas.",
    href: "https://memotron.app"
  }
]);

/**
 * @deprecated - merged into Fyweb
 */
export const portalsStore = readable<ITileItem[]>([
  {
    image: staticUrl + "/images/product/ar-product-image.png",
    title: "Action Router",
    label: "Discover the best roadmap for any action",
    href: "https://actionrouter.com"
  }
]);

/**
 * @deprecated - merged into Fyweb
 */
export const microToolsStore = readable<ITileItem[]>([
  {
    title: "Depersonate",
    label: "Kill digital impersonation with 1 click",
    href: "https://dapien.com/depersonate"
  },
  {
    title: "Manifest v3 checker",
    label: "Check if your extension manifest v3 is valid",
    href: "https://manifestv3checker.21n.io"
  }
]);

export const upcomingProductsStore = writable<ITileItem[]>([
  // {
  //   icon: "",
  //   title: "Selftron",
  //   label: "Your health compass.",
  //   description:
  //     "Selftron offers top-notch tracking and analytics for your body and mind, making it easier to understand and improve your wellness"
  // },
  {
    icon: "nucleus",
    title: "Nucleus",
    label: "Your life's digital harmony.",
    description: "",
    href: "https://docs.21n.org/21n/products/up-next"
  },
  // {
  //   icon: "",
  //   title: "Product router",
  //   label: "Discover your next favorite product.",
  //   description:
  //     "Product router is a platform that helps you discover new products and services that you might be interested in"
  // },
  {
    icon: "",
    title: "Fyweb",
    label: "The next generation of the web.",
    description: "",
    href: "https://docs.21n.org/21n/products/up-next"
  },
  {
    icon: "",
    title: "Recloud",
    label: "Redoing the cloud.",
    description: "",
    href: "https://recloud.io"
  }
  // {
  //   icon: "",
  //   title: "Longpress",
  //   label: "Next generation of search and discovery.",
  //   description:
  //     "Longpress is a next-gen search and discovery platform powered by AI"
  // },
  // {
  //   icon: "",
  //   title: "Dapien",
  //   label: "Your new address on the internet",
  //   description:
  //     "Dapien offers a new way to showcase your identity and connect with others, giving you a unique address on the internet to share and discove"
  // },

  // {
  //   icon: "",
  //   title: "Gathery",
  //   label: "Transforming how humans come together.",
  //   description:
  //     "Gathery redefines how you meet people and form groups, making connections simpler and more meaningful"
  // }
]);

export const isProductsPanelOpen = writable<Boolean>(false);

export const isProductPage = writable<Boolean>(false);

class LandingStore {
  protected subject = writable<ILandingStoreSubject>();
  subscribe = this.subject.subscribe;
  update = this.subject.update;

  load(urls: ILandingProductUrls) {
    this.subject.set({ urls });
  }

  openLink(url: string) {
    if (!url) return;
    if (!url.includes("http")) {
      // dispatchCustomEvent(GlobalEvent.CUSTOM_NAVIGATION, { path: url });
      // window.location.href = url;
      window.open(url, "_self");
      return;
    }

    let win = window?.open(url, "_blank");
    if (win) {
      win.focus();
    }
  }
}

export const landing = new LandingStore();
