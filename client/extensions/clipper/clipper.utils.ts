import { logger } from "$lib/client/components/debug/logger.client";
import type { OmitForCapture } from "$lib/client/components/flux/resourceStores/resource.type";
import { ClipperElementIdentifier } from "$lib/client/products/memotron/common/clip.type";
import {
  NodeType,
  type ITweet,
  type ITwitterProfile,
  type ILinkedInProfile,
  type IWebPage,
  type ILinkedInPost,
  type IBlueskyPost,
  type IBlueskyProfile,
  type IThreadsPost,
  type IThreadsProfile,
  type IInstagramPost,
  type IInstagramProfile,
  type IFacebookPost,
  type IFacebookProfile,
  type IMastodonPost,
  type IMastodonProfile,
  type IRedditPost,
  type IRedditProfile,
  type IRedditSub
} from "$lib/client/products/memotron/node/node.type";
import {
  contentTypeMap,
  fetchYouTubeMetadata
} from "$lib/client/products/memotron/node/url.utils";
import {
  parseFullDateTimeString,
  parseRelativeTimeToISO
} from "$lib/client/utils/time.utils";
import {
  generateHash,
  generateRandomIdv2,
  generateSHA256Hash
} from "$lib/shared/utils/crypto.utils";
import { enumToString } from "$lib/shared/utils/text.utils";
import type {
  ISocialPost,
  ISocialPostBase,
  ISocialPostParser,
  IWebpageParser
} from "./clipper.type";

const csuiSelector = "plasmo-csui";

export function isYoutubeVideoUrl(url) {
  const regex = /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/;
  return regex.test(url);
}

export function extractVideoId(url) {
  const match = url.match(
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/
  );
  return match ? match[2] : null;
}

/**
 * @deprecated - using anchor and svelte component instead
 * @param controlElement
 * @returns
 */
export function createClipButton(controlElement) {
  const clipButton = document.createElement("button");
  clipButton.className = "ytclip";
  clipButton.innerHTML = `
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                           <path d="M15.8103 5.45252L20.6058 5.00266C20.9096 4.97418 21.0723 5.17793 20.9688 5.45836C20.9688 5.45836 13.6738 17.2629 13.076 18.1115C12.4782 18.9602 11.9535 19.5909 10.8974 18.1115C9.84133 16.6322 3.03079 5.45836 3.03079 5.45836C2.92804 5.17793 3.09079 4.97418 3.39455 5.00266L8.19013 5.45252C8.49388 5.481 8.82314 5.73222 8.92364 6.01265C8.92364 6.01265 11.5 10.9796 12.0133 10.9796C12.5266 10.9796 15.0767 6.01338 15.0767 6.01338C15.1772 5.73222 15.5057 5.481 15.8103 5.45252Z" fill="white"/>
                          </svg>
                          `;

  const controlHeight = controlElement.offsetHeight;
  clipButton.style.padding = "0";
  clipButton.style.border = "1px solid #0056b3";
  clipButton.style.background = "#007bff";
  clipButton.style.height = "${controlHeight}px";
  clipButton.style.width = "${controlHeight}px";
  clipButton.style.borderRadius = "4px";
  clipButton.style.display = "flex";
  clipButton.style.alignItems = "center";
  clipButton.style.justifyContent = "center";

  clipButton.addEventListener("mousedown", () => {
    clipButton.style.transform = "scale(0.95)";
  });
  clipButton.addEventListener("mouseup", () => {
    clipButton.style.transform = "scale(1)";
  });
  clipButton.addEventListener("mouseout", () => {
    clipButton.style.transform = "scale(1)";
  });

  return clipButton;
}

export function createClipPointer() {
  const pointer = document.createElement("div");
  pointer.className = "memotron-clip-pointer";

  pointer.innerHTML = `
                       <svg width="16" height="19" viewBox="0 0 16 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0.6 0H15.4C15.7314 0 16 0.26863 16 0.600001V13.1844C16 13.382 15.9027 13.5669 15.7399 13.6788L8.33992 18.7663C8.13517 18.9071 7.86483 18.9071 7.66008 18.7663L0.260083 13.6788C0.0972701 13.5669 0 13.382 0 13.1844V0.6C0 0.268629 0.26863 0 0.6 0Z" fill="#2c70dd"/>
          <path d="M0.6 0H15.4C15.7314 0 16 0.26863 16 0.600001V13.1844C16 13.382 15.9027 13.5669 15.7399 13.6788L8.33992 18.7663C8.13517 18.9071 7.86483 18.9071 7.66008 18.7663L0.260083 13.6788C0.0972701 13.5669 0 13.382 0 13.1844V0.6C0 0.268629 0.26863 0 0.6 0Z" fill="none" stroke="white" stroke-width="0" />
</svg>

                           `;
  pointer.style.backgroundSize = "contain";
  pointer.style.backgroundRepeat = "no-repeat";
  pointer.style.width = "20px";
  pointer.style.height = "20px";
  pointer.style.cursor = "pointer";
  pointer.style.position = "absolute";
  pointer.style.zIndex = "10000";
  pointer.style.bottom = "70px";

  const path = pointer.querySelector("path");
  const strokePath = pointer.querySelectorAll("path")[1];
  path.style.transition = "fill-opacity 0.2s";
  path.style.fillOpacity = "0.6";
  path.style.border = "1px solid transparent";
  strokePath.style.transition = "stroke-width 0.2s";

  pointer.addEventListener("mouseenter", () => {
    path.style.fillOpacity = "1";
    pointer.style.bottom = "72px";
    strokePath.style.strokeWidth = "2";
  });

  pointer.addEventListener("mouseleave", () => {
    path.style.fillOpacity = "0.6";
    pointer.style.bottom = "70px";
    path.style.border = "1px solid transparent";
    strokePath.style.strokeWidth = "0";
  });

  return pointer;
}

/**
 * Extracts full tab data from the current tab.
 * Note: This function should be called only from the content script.
 * @returns TabData
 */
export async function extractFullTabData(
  doc?: Document,
  params?: {
    url?: string;
    docText?: string;
  }
): Promise<OmitForCapture<IWebPage>> {
  doc = doc ?? document;
  const title = doc.title;
  const faviconLink = (
    doc.querySelector("link[rel*='icon']") as HTMLLinkElement
  )?.href;
  const appIconLinks = Array.from(
    doc.querySelectorAll("link[rel='apple-touch-icon']"),
    (link) => (link as HTMLLinkElement).href
  );
  const description = (
    doc.querySelector("meta[name='description']") as HTMLMetaElement
  )?.content;
  const keywords = (
    doc.querySelector("meta[name='keywords']") as HTMLMetaElement
  )?.content;
  const twitterCard = (
    doc.querySelector("meta[name='twitter:card']") as HTMLMetaElement
  )?.content;
  const { ogTitle, ogImage, ogDescription, ogUrl } = resolveOgData(doc);
  const browser = extractBrowserDetails();
  // console.log({ innerHTML: doc.body?.innerHTML, docText: params?.docText });
  const hash = await generateSHA256Hash(doc.body?.innerHTML ?? params?.docText);
  const url = params?.url ? resolveUrl(params.url) : resolveUrl();
  const contentType = resolveContentTypeForUrl(url);
  return {
    label: title,
    contentType,
    url,
    body: {
      hash,
      description
    },
    metadata: {
      faviconLink,
      appIconLinks,
      keywords,
      ogImage,
      ogTitle,
      ogDescription,
      ogUrl,
      twitterCard,
      browser
    }
  };
}

export function extractMinimalTabData(): OmitForCapture<IWebPage> {
  const title = document.title;
  const hash = generateHash(document.body.innerHTML);
  const { ogTitle, ogImage, ogDescription, ogUrl } = resolveOgData();
  const browser = extractBrowserDetails();
  const url = resolveUrl();
  const contentType = resolveContentTypeForUrl(url);
  logger.log({ at: "extractMinimalTabData", url, contentType });
  return {
    metadata: { ogTitle, ogImage, ogDescription, ogUrl, browser },
    label: title,
    contentType,
    url,
    body: { hash }
  };
}

export async function extractYoutubeVideoData() {
  const hash = generateHash(document.body.innerHTML);
  const url = resolveUrl();
  let title = document.title;
  let metadata;
  let youtubeMetadataFromOEmbedAPI;
  try {
    youtubeMetadataFromOEmbedAPI = await fetchYouTubeMetadata(
      window.location.href
    );
  } catch (e) {
    logger.error({ at: "extractYoutubeVideoData", error: e });
  }
  if (youtubeMetadataFromOEmbedAPI) {
    title = title ?? youtubeMetadataFromOEmbedAPI.title;
    metadata = {
      authorName: youtubeMetadataFromOEmbedAPI.author_name,
      authorUrl: youtubeMetadataFromOEmbedAPI.author_url,
      thumbnailUrl: youtubeMetadataFromOEmbedAPI.thumbnail_url
    };
  }
  return {
    label: title,
    contentType: NodeType.YOUTUBE_VIDEO,
    url,
    body: { hash },
    metadata
  };
}

/**
 * UaData is causing below dexie error when insert -
 * Failed to execute 'put' on 'IDBObjectStore': NavigatorUAData object could not be cloned.
 DataCloneError: Failed to execute 'put' on 'IDBObjectStore': NavigatorUAData object could not be cloned.

 * @returns
 */
function extractBrowserDetails() {
  const userAgent = navigator.userAgent;
  const uAData = {}; //navigator.userAgentData;
  return { userAgent, uAData };
}

export function resolveUrl(url?: string) {
  if (!url) url = window.location.href;
  url = url.split("#")[0];
  if (url.includes("youtube.com")) {
    return url.split("&")[0];
  }
  return url;
}

function resolveOgData(doc?: Document) {
  doc = doc ?? document;
  const ogTitle = (
    doc.querySelector("meta[property='og:title']") as HTMLMetaElement
  )?.content;
  const ogImage = (
    doc.querySelector("meta[property='og:image']") as HTMLMetaElement
  )?.content;
  const ogDescription = (
    doc.querySelector("meta[property='og:description']") as HTMLMetaElement
  )?.content;
  const ogUrl = (
    doc.querySelector("meta[property='og:url']") as HTMLMetaElement
  )?.content;
  const ogSiteName = (
    doc.querySelector("meta[property='og:site_name']") as HTMLMetaElement
  )?.content;
  return { ogTitle, ogImage, ogDescription, ogUrl, ogSiteName };
}

export function resolveContentTypeString(contentType: NodeType | null) {
  if (!contentType) return "web page";
  else if (contentType === NodeType.WEB_SCREENSHOT_CLIP) return "screenshot";
  else return enumToString(contentType);
}

export function resolveContentTypeForUrl(url: string) {
  return (
    contentTypeMap.find((item) => item.regex.some((regex) => regex.test(url)))
      ?.contentType ?? NodeType.WEB_PAGE
  );
}

function findAncestorOrSelf(element, selector) {
  if (element.matches(selector)) {
    return element;
  }
  let currentElement = element;
  while (currentElement) {
    if (
      currentElement.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
      currentElement.host
    ) {
      currentElement = currentElement.host;
    } else {
      currentElement = currentElement.parentNode;
    }
    if (!currentElement || currentElement === document) {
      return null;
    }
    if (currentElement.matches && currentElement.matches(selector)) {
      return currentElement;
    }
  }
  return null;
}

function resolveParentNLevel(n: number, element: Element) {
  const root = Array.from({ length: n }).reduce(
    (current, _) => current?.parentElement,
    element
  );
  return root;
}

/**
 *
 * Note: media is not currently included in the content of the tweet as it might require reuploading the media to s3 and using in the app.
 *
 * @param tweetArticle
 * @returns
 */
function parseTweetContent(
  tweetArticle: Element,
  isMainTweetPost: boolean = false
): ISocialPost<ITweet, ITwitterProfile> | undefined {
  if (!tweetArticle) return;
  const tweetBody = tweetArticle.querySelector('[data-testid="tweetText"]');
  const linkElements = tweetArticle.querySelectorAll("a");
  const timeElements = tweetArticle.querySelectorAll("time");

  let tweetContent = tweetBody
    ? tweetBody.textContent
    : "No tweet content found";
  let tweetLinks = Array.from(linkElements).map((link) => ({
    text: link.textContent,
    href: link.getAttribute("href")
  }));
  let tweetTime = Array.from(timeElements).map((time) => {
    return {
      text: time.textContent,
      datetime: time.getAttribute("datetime")
    };
  });

  logger.log({
    at: "parsedTweetContent",
    tweetContent,
    tweetLinks,
    tweetTime
  });
  const domain = contentTypeMap.find(
    (item) => item.contentType === NodeType.TWEET
  )?.currentDomain;
  const { username, authorName, tweetId, externalLinks, profileImageUrl } =
    extractInfoFromLinks(tweetLinks, isMainTweetPost);

  let postedAt = 0;
  if (
    tweetTime[0]?.datetime &&
    !isNaN(new Date(tweetTime[0]?.datetime).getTime())
  ) {
    postedAt = new Date(tweetTime[0]?.datetime).getTime();
  }

  const profileUrl = `https://${domain}/${username}`;
  const data: OmitForCapture<ITweet> = {
    contentType: NodeType.TWEET,
    url: `https://${domain}/${username}/status/${tweetId}`,
    label: "",
    body: {
      content: tweetContent ?? "",
      postedAt
    },
    text: tweetContent ?? "",
    metadata: {
      postId: tweetId,
      username,
      tweetId,
      externalLinks,
      postedAt: tweetTime[0]?.datetime ?? ""
    }
  };

  const parent: OmitForCapture<ITwitterProfile> = {
    contentType: NodeType.TWITTER_PROFILE,
    url: profileUrl,
    label: authorName,
    body: {
      name: authorName,
      username,
      profileImageUrl
    },
    text: `${authorName} ${username}`,
    metadata: {}
  };

  return {
    data,
    parent
  };

  function extractInfoFromLinks(data: any, isMainTweetPost: boolean = false) {
    let username = "";
    let authorName = "";
    let tweetId = "";
    const currentUrl = window.location.pathname;
    const urlMatch = currentUrl.match(/\/(\w+)\/status\/(\d+)/);
    if (urlMatch && isMainTweetPost) {
      username = urlMatch[1];
      tweetId = urlMatch[2];
    } else {
      const statusItem = data.find((item) => item.href.includes("/status/"));
      if (statusItem) {
        const match = statusItem.href.match(/\/(\w+)\/status\/(\d+)/);
        if (match) {
          username = match[1];
          tweetId = match[2];
        }
      }
    }
    if (username) {
      const authorItem = data.find(
        (item) =>
          item.href === `/${username}` &&
          item.text &&
          item.text !== `@${username}`
      );
      if (authorItem) {
        authorName = authorItem.text;
      }
    }
    const media = data
      .filter((item) => item.href.includes("/photo"))
      .map((item) => item.href);
    const imgElements = tweetArticle.querySelectorAll("img");
    if (imgElements) {
      media.push(...Array.from(imgElements).map((img) => img.src));
    }
    const externalLinks = data
      .filter((item) => item.href.includes("https://"))
      .map((item) => item.href);
    const profileImageUrl = media.find((item) =>
      item.includes("profile_images")
    );
    return {
      username,
      authorName,
      tweetId,
      externalLinks,
      profileImageUrl
    };
  }
}

const tweetPostSelector = 'article[data-testid="tweet"]';

function extractTweetFromInlineClip(
  element: Element
): ISocialPost<ITweet, ITwitterProfile> | undefined {
  const tweetArticle = findAncestorOrSelf(element, tweetPostSelector);
  if (!tweetArticle) return;
  const isPostPage = window.location.pathname.includes("/status/");
  const data = parseTweetContent(tweetArticle);
  if (!data) return;
  return { ...data, isPostPage };
}

export function extractTweetFromTweeetPage():
  | ISocialPost<ITweet, ITwitterProfile>
  | undefined {
  const tweetElement = document.getElementById(
    ClipperElementIdentifier.MAIN_TWEET_POST
  );
  const tweetId = window.location.pathname.split("/status/")[1];
  const regex = new RegExp(tweetId, "i");
  const allLinks = document.querySelectorAll("a");
  const element = Array.from(allLinks).find((link) =>
    regex.test(link.getAttribute("href"))
  );
  if (!tweetElement && !element) return;
  const root = findAncestorOrSelf(tweetElement ?? element, tweetPostSelector);
  return parseTweetContent(root, true);
}

/**
 * This function is triggered from twitter profile page.
 * @returns
 */
export function extractTwitterProfile(): OmitForCapture<ITwitterProfile> {
  const url = window.location.href;
  const username = url.split("https://")[1].split("/")[1];
  const bioElement = document.querySelector('[data-testid="UserDescription"]');
  const nameElement = document.querySelector('[data-testid="UserName"]');
  const linkElement = document.querySelector('[data-testid="UserUrl"]');
  const avatarElement = document.querySelector(
    `[data-testid^="UserAvatar-Container-${username}"]`
  );
  const imgElement = avatarElement?.querySelector("img");
  const profileImageUrl = imgElement?.src;
  const { ogTitle } = resolveOgData();
  const name = nameElement?.textContent?.split("@")[0];
  const bio = bioElement?.textContent;
  const bioLink = linkElement?.href;
  const bioLinkText = linkElement?.textContent;
  const text = `${name}\n${bio}`.trim();
  return {
    url,
    label: name ?? "",
    text,
    body: {
      username,
      name: name ?? "",
      bio: bio ?? "",
      profileImageUrl: profileImageUrl ?? ""
    },
    metadata: { ogTitle, bioLink, bioLinkText: bioLinkText ?? "" },
    contentType: NodeType.TWITTER_PROFILE
  };
}

function extractLinkedInPostFromPage():
  | ISocialPost<ILinkedInPost, ILinkedInProfile>
  | undefined {
  const root = document.querySelector("[data-urn]");
  if (!root) return;
  return parseLinkedInPost(root);
}

function extractLinkedInPostFromInlineClip(
  element: Element
): ISocialPost<ILinkedInPost, ILinkedInProfile> | undefined {
  let root = findAncestorOrSelf(element, "[data-id]");
  if (!root) root = findAncestorOrSelf(element, "[data-urn]");
  if (!root) return;
  return parseLinkedInPost(root);
}

function parseLinkedInPost(
  root: Element
): ISocialPost<ILinkedInPost, ILinkedInProfile> {
  const textEl = root.querySelector(
    ".update-components-text.update-components-update-v2__commentary, .update-components-text"
  ) as HTMLElement;
  let text = textEl?.textContent?.trim() ?? "";
  if (!text) {
    const fallbackTextEl = root.querySelector(
      ".feed-shared-inline-show-more-text .break-words, .attributed-text-segment-list__content"
    );
    text = fallbackTextEl?.textContent?.trim() ?? "";
  }

  // Extract time from sub-description (contains "1d •" etc.)
  const timeEl = root.querySelector(
    ".update-components-actor__sub-description"
  );
  const timeText = timeEl?.textContent?.trim();

  const authorLink = root.querySelector(
    ".update-components-actor__meta-link"
  ) as HTMLAnchorElement;

  const avatarImg = root.querySelector(
    ".update-components-actor__avatar-image"
  ) as HTMLImageElement;

  const links = Array.from(root.querySelectorAll('a[href^="http"]'))
    .map((a: any) => a.href)
    .filter(
      (href: string) =>
        !href.includes("linkedin.com/in/") &&
        !href.includes("linkedin.com/company/") &&
        !href.includes("linkedin.com/feed/") &&
        !href.includes("linkedin.com/posts/") &&
        !href.includes("linkedin.com/search/") &&
        !href.includes("linkedin.com/showcase/") &&
        !href.includes("miniProfileUrn=")
    );

  let authorHandle =
    authorLink?.href?.match(/linkedin\.com\/in\/([^?]+)/)?.[1] ??
    authorLink?.href?.match(/linkedin\.com\/company\/([^?]+)/)?.[1];

  authorHandle = authorHandle?.split("/posts")[0] ?? authorHandle;

  const authorNameEl = root
    .querySelector(".update-components-actor__title")
    ?.querySelector("span.visually-hidden");
  const authorName = authorNameEl?.textContent?.trim() ?? "";

  const authorUrl = authorLink?.href?.split("?")[0] ?? undefined;
  const jobTitleEl = root.querySelector(
    ".update-components-actor__description"
  );
  const jobTitle =
    jobTitleEl?.textContent && !jobTitleEl.textContent.includes("followers")
      ? jobTitleEl?.textContent?.trim()
      : undefined;

  const postUrn = root.getAttribute("data-id") ?? root.getAttribute("data-urn");
  const postId = postUrn?.match(/activity:(\d+)/)?.[1];
  const postUrl = postId
    ? `https://www.linkedin.com/feed/update/${postUrn}/`
    : window.location.href;

  const rel = timeText?.match(/(\d+\s*[smhdw]|\d+\s*mo|\d+\s*y)/i)?.[1];
  const postedAtStr = rel ? parseRelativeTimeToISO(rel) : undefined;
  let postedAt = 0;
  if (postedAtStr && !isNaN(new Date(postedAtStr).getTime())) {
    postedAt = new Date(postedAtStr).getTime();
  }
  const username = authorHandle ?? "unknown";
  const data: OmitForCapture<ILinkedInPost> = {
    text,
    label: "",
    contentType: NodeType.LINKEDIN_POST,
    body: {
      postedAt
    },
    metadata: {
      postId: postId ?? "unknown",
      username,
      links,
      headline: jobTitle,
      postedAt: postedAtStr ?? ""
    },
    url: postUrl
  };
  const parent: OmitForCapture<ILinkedInProfile> = {
    contentType: NodeType.LINKEDIN_PROFILE,
    label: authorName,
    text: `${authorName} - ${authorHandle} on LinkedIn`,
    body: {
      username,
      profileImageUrl: avatarImg?.src ?? undefined
    },
    metadata: {
      headline: jobTitle
    },
    url: authorUrl
  };
  return {
    data,
    parent
  };
}

/**
 * This function is triggered from LinkedIn profile page.
 * @returns
 */
export function extractLinkedInProfile(): OmitForCapture<ILinkedInProfile> {
  const url = window.location.href;
  const username = url.split("/in/")[1]?.split("/")[0] || "";

  const nameElement = document.querySelector("h1");
  const name = nameElement?.textContent?.trim() || "";

  let profileImageElement = document.querySelector(
    'img[data-anonymize="headshot"]'
  ) as HTMLImageElement;
  if (!profileImageElement) {
    profileImageElement = document.querySelector(
      "img.pv-top-card-profile-picture__image--show"
    ) as HTMLImageElement;
  }
  const profileImageUrl = profileImageElement?.src || "";

  let headlineElement = document.querySelector(
    '[data-generated-suggestion-target*="headline"]'
  );
  if (!headlineElement) {
    const titleElement =
      document.querySelector(".distance-badge")?.parentElement;
    headlineElement = titleElement?.nextElementSibling as HTMLElement;
  }
  const headline = headlineElement?.textContent?.trim() || "";

  const currentCompanyElement = document.querySelector(
    '[aria-label^="Current company"]'
  );
  const currentCompany = currentCompanyElement?.textContent?.trim() || "";

  const educationElement = document.querySelector('[aria-label^="Education"]');
  const education = educationElement?.textContent?.trim() || "";

  const locationElement = document.querySelector(
    ".text-body-small.inline.t-black--light.break-words"
  );
  const location = locationElement?.textContent?.trim() || "";

  const aboutHeading = Array.from(document.querySelectorAll("h2")).find(
    (h2) => h2.textContent?.trim() === "AboutAbout"
  );
  const aboutSection = aboutHeading?.closest("section");
  const bio =
    Array.from(aboutSection?.querySelectorAll(".visually-hidden") || [])
      .map((p) => p.textContent?.trim())
      .join("\n") || "";

  const memberIdMatch = url.match(/\/in\/([^/?]+)/);
  const memberId = memberIdMatch ? memberIdMatch[1] : "";

  const text = `${name}\n${headline}\n${bio}`.trim();
  const { ogTitle } = resolveOgData();

  return {
    url,
    label: name,
    text,
    body: {
      username: memberId,
      bio,
      profileImageUrl
    },
    metadata: {
      ogTitle,
      headline,
      currentCompany,
      education,
      location,
      publicProfileUrl: url
    },
    contentType: NodeType.LINKEDIN_PROFILE
  };
}

export function extractBlueskyProfile(): OmitForCapture<IBlueskyProfile> {
  const url = window.location.href;
  const username = url.split("/profile/")[1]?.split("/")[0] || "";

  const displayNameElement = document.querySelector(
    '[data-testid="profileHeaderDisplayName"]'
  );
  const displayName = displayNameElement?.textContent?.trim() || "";

  const usernameElement = document.querySelector(
    '[data-testid="profileHeaderHandle"]'
  );
  let handle = usernameElement?.textContent?.trim() || "";
  if (handle.startsWith("@")) {
    handle = handle.substring(1);
  }

  if (!handle && username) {
    handle = username;
  }

  const bioElement = document.querySelector(
    '[data-testid="profileHeaderDescription"]'
  );
  const bio = bioElement?.textContent?.trim() || "";

  const avatarElement = document.querySelector(
    '[data-testid="userAvatarImage"] img'
  );
  const profileImageUrl = avatarElement?.src || "";

  const bannerElement = document.querySelector(
    '[data-testid="userBannerImage"] img'
  );
  const bannerImageUrl = bannerElement?.src || "";

  const followersElement = document.querySelector(
    '[data-testid="profileHeaderFollowersButton"]'
  );
  const followersText = followersElement?.textContent?.trim() || "";
  const followersCount = followersText.split(" ")[0] || "0";

  const followingElement = document.querySelector(
    '[data-testid="profileHeaderFollowsButton"]'
  );
  const followingText = followingElement?.textContent?.trim() || "";
  const followingCount = followingText.split(" ")[0] || "0";

  const label = displayName || handle;
  const text = `${label}\n${displayName}\n${bio}`.trim();
  const { ogTitle } = resolveOgData();

  return {
    url,
    label,
    text,
    body: {
      username: handle,
      bio,
      profileImageUrl
    },
    metadata: {
      ogTitle,
      displayName,
      followersCount,
      followingCount,
      bannerImageUrl
    },
    contentType: NodeType.BLUESKY_PROFILE
  };
}

const blueSkyPostThreadSelector = '[data-testid^="postThreadItem-"]';

function extractBskyPostFromInlineClip(
  element: Element
): ISocialPost<IBlueskyPost, IBlueskyProfile> | undefined {
  let root = findAncestorOrSelf(element, '[data-testid^="feedItem-"]');
  let isPostPage = false;
  if (!root) {
    root = findAncestorOrSelf(element, blueSkyPostThreadSelector);
    if (root) isPostPage = true;
  }
  if (!root) return;
  let data = parseBlueSkyPost(root);
  return { ...data, isPostPage };
}

export function extractBskyPostFromPage():
  | ISocialPost<IBlueskyPost, IBlueskyProfile>
  | undefined {
  const postId = window.location.pathname.split("/post/")[1];
  if (!postId) return;
  const regex = new RegExp(postId, "i");
  const allLinks = document.querySelectorAll("a");
  const element = Array.from(allLinks).find((link) =>
    regex.test(link.getAttribute("href"))
  );
  if (!element) return;
  const root = findAncestorOrSelf(element, blueSkyPostThreadSelector);
  if (!root) return;
  return parseBlueSkyPost(root, true);
}

function parseBlueSkyPost(
  root: Element,
  isPostPage: boolean = false
): ISocialPostBase<IBlueskyPost, IBlueskyProfile> {
  let textEl = (root.querySelector(
    '[data-testid="postText"], [data-lexical-text]'
  ) || root.querySelector('[data-testid="recordText"]')) as HTMLElement;
  if (!textEl) {
    const fallbackDiv = root.querySelector("div[data-word-wrap='1']");
    textEl = fallbackDiv as HTMLElement;
  }
  const timeEl = root.querySelector("time");
  const authorLink = (root.querySelector(
    'a[href^="/@"], a[href*="/profile/"]'
  ) ||
    root.querySelector('a[aria-label*="View profile" i]')) as HTMLAnchorElement;
  const avatarLink = root.querySelector(
    'div[data-testid="userAvatarImage"]'
  ) as HTMLDivElement;
  const authorName = avatarLink?.closest("a")?.ariaLabel?.trim();
  const authorImgUrl = avatarLink?.querySelector("img")?.src;
  const avatarImg = root.querySelector(
    'img[alt*="avatar" i], img[alt*="profile" i]'
  ) as HTMLImageElement;
  const postLink =
    (
      Array.from(
        root.querySelectorAll('a[href*="/post/"]')
      ) as HTMLAnchorElement[]
    ).find((a) => /\/post\/[A-Za-z0-9]+\/?$/.test(a.href)) ||
    ((
      Array.from(
        root.querySelectorAll('a[href*="/profile/"][href*="/post/"]')
      ) as HTMLAnchorElement[]
    ).find((a) =>
      /\/post\/[A-Za-z0-9]+\/?$/.test(a.href)
    ) as HTMLAnchorElement);
  let postUrl = postLink?.href;
  if (!postLink && /\/post\/[A-Za-z0-9]+\/?$/.test(window.location.href)) {
    postUrl = window.location.href;
  }
  const postId = postUrl?.match(/\/post\/([A-Za-z0-9]+)\/?$/)?.[1];
  const links = Array.from(root.querySelectorAll('a[href^="http"]'))
    .map((a: any) => a.href)
    .filter(
      (href: string) => !href.includes("/profile/") && !href.includes("/post/")
    );
  const authorHandle = authorLink?.pathname?.startsWith("/@")
    ? authorLink.pathname.substring(2)
    : authorLink?.href?.match(/profile\/(.+?)(?:$|\/)/)?.[1];
  const authorUrl = authorLink
    ? new URL(authorLink.href, window.location.origin).toString()
    : undefined;
  const timeElement = Array.from(root.querySelectorAll("[aria-label]")).find(
    (el: Element) =>
      typeof el.getAttribute("aria-label") === "string" &&
      /\bat\b/.test(el.getAttribute("aria-label")!)
  ) as HTMLElement | undefined;
  const postedAtString = timeElement?.getAttribute("aria-label") ?? undefined;
  const username = authorHandle ?? "unknown";
  let postedAt = 0;
  if (postedAtString) {
    const date = parseFullDateTimeString(postedAtString);
    if (date) {
      postedAt = date.getTime();
    }
  }
  const data: OmitForCapture<IBlueskyPost> = {
    contentType: NodeType.BLUESKY_POST,
    text: textEl?.innerText?.trim(),
    label: "",
    body: {
      postedAt,
      links
    },
    metadata: {
      postId: postId ?? "unknown",
      username,
      postedAt: postedAtString ?? timeEl?.getAttribute("datetime") ?? ""
    },
    url: postUrl
  };

  const parent: OmitForCapture<IBlueskyProfile> = {
    contentType: NodeType.BLUESKY_PROFILE,
    label: authorName ?? authorLink?.textContent?.trim() ?? "",
    text: `${authorName ?? authorLink?.textContent?.trim()} ${authorHandle}`,
    body: {
      username,
      profileImageUrl: authorImgUrl ?? avatarImg?.src ?? undefined
    },
    url: authorUrl ?? ""
  };
  return {
    data,
    parent
  };
}

function extractThreadsPostFromPage():
  | ISocialPost<IThreadsPost, IThreadsProfile>
  | undefined {
  const postId = window.location.pathname.split("/post/")[1];
  if (!postId) return;
  const regex = new RegExp(postId, "i");
  const allLinks = document.querySelectorAll("a");
  const element = Array.from(allLinks).find(
    (link) =>
      regex.test(link.getAttribute("href")) && link.ariaLabel !== "Column title"
  );
  if (!element) return;
  const root = resolveParentNLevel(7, element);
  const clipButtonElement = root?.querySelector(csuiSelector);
  if (!clipButtonElement) return;
  return parseThreadsPost(clipButtonElement);
}

function extractThreadsPostFromInlineClip(
  element: Element
): ISocialPost<IThreadsPost, IThreadsProfile> | undefined {
  const isPostPage = window.location.pathname.includes("/post/");
  const data = parseThreadsPost(element);
  if (!data) return;
  return { ...data, isPostPage };
}

function parseThreadsPost(
  element: Element
): ISocialPostBase<IThreadsPost, IThreadsProfile> | undefined {
  const csui = findAncestorOrSelf(element, csuiSelector);
  const root = resolveParentNLevel(5, csui);
  const contentElements = csui?.parentElement?.parentElement
    ? Array.from(
        csui.parentElement.parentElement.parentElement?.children ?? []
      ).filter((el) => el !== csui.parentElement.parentElement)
    : undefined;
  if (!root) return;
  // Extract text content
  const textElements = root.querySelectorAll('[data-lexical-text="true"]');
  let text = "";
  textElements.forEach((el) => {
    if (el.textContent && el.textContent.trim()) {
      text += el.textContent.trim() + " ";
    }
  });
  text = text.trim();
  if (!text) {
    const textContentElement = contentElements?.find(
      (x) => !x.querySelector("img") && !x.querySelector("svg")
    );
    text = textContentElement?.textContent?.trim() ?? "";
  }
  const imageContentElement = contentElements?.find((x) =>
    x.querySelector("img")
  );
  let imageUrls: string[] = [];
  if (imageContentElement) {
    imageUrls =
      Array.from(
        (imageContentElement as HTMLDivElement).querySelectorAll("img")
      )
        ?.map((img) => img.src)
        ?.filter(Boolean) ?? [];
  }
  const timeEl = root.querySelector("time");
  const authorLink = root.querySelector('a[href*="/@"]') as HTMLAnchorElement;
  const avatarImg = root.querySelector(
    'img[alt*="profile picture"], img[alt*="avatar"]'
  ) as HTMLImageElement;

  const postLink = root.querySelector('a[href*="/post/"]') as HTMLAnchorElement;

  const links = Array.from(root.querySelectorAll('a[href^="http"]'))
    .map((a: any) => a.href)
    .filter(
      (href: string) =>
        !href.includes("/@") &&
        !href.includes("/post/") &&
        !href.includes("threads.net")
    );

  const authorHandle = authorLink?.pathname?.startsWith("/@")
    ? authorLink.pathname.substring(2)
    : authorLink?.href?.match(/@(.+?)(?:$|\/)/)?.[1];

  const authorName = authorLink?.textContent?.trim();

  const authorUrl = authorLink
    ? new URL(authorLink.href, window.location.origin).toString()
    : undefined;

  const postIdMatch = postLink?.href?.match(/\/post\/([A-Za-z0-9]+)(?:$|\?)/);
  const postId = postIdMatch ? postIdMatch[1] : undefined;

  const postUrl = postLink
    ? new URL(postLink.href, window.location.origin).toString()
    : window.location.href;
  const postedAtStr = timeEl?.getAttribute("datetime");
  let postedAt = 0;
  if (postedAtStr && !isNaN(new Date(postedAtStr).getTime())) {
    postedAt = new Date(postedAtStr).getTime();
  }
  const data: OmitForCapture<IThreadsPost> = {
    contentType: NodeType.THREADS_POST,
    label: "",
    text,
    body: {
      postedAt,
      links
    },
    metadata: {
      postId: postId ?? `unknown_${generateRandomIdv2()}`,
      postedAt: postedAtStr,
      username: authorHandle ?? "unknown",
      media: imageUrls
    },
    url: postUrl
  };
  const parent: OmitForCapture<IThreadsProfile> = {
    contentType: NodeType.THREADS_PROFILE,
    text: `${authorName}`,
    label: authorName ?? "",
    body: {
      username: authorHandle ?? "unknown",
      profileImageUrl: avatarImg?.src ?? undefined
    },
    url: authorUrl ?? ""
  };
  return {
    data,
    parent
  };
}

export function extractThreadsProfile(): OmitForCapture<IThreadsProfile> {
  const url = window.location.href;
  const username = url.split("/@")[1]?.split("/")[0] || "";

  const h1Elements = document.querySelectorAll("h1");
  const displayNameElement = h1Elements[1] || h1Elements[0];
  const displayName = displayNameElement?.textContent?.trim() || "";

  const usernameElements = Array.from(document.querySelectorAll("span")).filter(
    (span) => span.textContent?.trim().startsWith(username)
  );
  let handle = username;
  if (usernameElements.length > 0) {
    handle = usernameElements[0].textContent?.trim() || username;
  }

  const bioElements = Array.from(document.querySelectorAll("span")).filter(
    (span) => {
      const text = span.textContent?.trim() || "";
      return (
        text.length > 50 &&
        !text.includes("followers") &&
        !text.includes("following") &&
        !text.startsWith("http") &&
        !text.includes(displayName) &&
        !text.includes(username)
      );
    }
  );
  const bio =
    bioElements.length > 0 ? bioElements[0].textContent?.trim() || "" : "";

  const avatarElement = document.querySelector('img[alt*="profile picture"]');
  const profileImageUrl = avatarElement?.src || "";

  const followersElements = Array.from(
    document.querySelectorAll("span")
  ).filter((span) => span.textContent?.includes("followers"));
  let followersCount = "0";
  if (followersElements.length > 0) {
    const followersText = followersElements[0].textContent?.trim() || "";
    followersCount = followersText.split(" ")[0] || "0";
  }

  const websiteLinks = Array.from(document.querySelectorAll('a[href^="http"]'))
    .filter(
      (link) =>
        !link.href.includes("threads.com") &&
        !link.href.includes("instagram.com/")
    )
    .map((link) => link.href);
  const websiteUrl = websiteLinks.length > 0 ? websiteLinks[0] : "";

  const label = displayName || handle;
  const text = `${label}\n${handle}\n${bio}`.trim();

  return {
    url,
    label,
    text,
    body: {
      username: handle,
      bio,
      profileImageUrl
    },
    metadata: {
      displayName,
      followersCount,
      websiteUrl
    },
    contentType: NodeType.THREADS_PROFILE
  };
}

export function extractInstagramProfileFromPage(): OmitForCapture<IInstagramProfile> {
  const url = window.location.href;
  const username = url.split("/").filter(Boolean).pop() || "";

  const displayNameElement = document.querySelector('h2[dir="auto"]');
  const displayName = displayNameElement?.textContent?.trim() || username;

  let handle = username;

  let bio = "";
  const bioElements = document.querySelectorAll(
    'span[dir="auto"], div[dir="auto"]'
  );
  for (const element of bioElements) {
    const text = element.textContent?.trim() || "";
    if (
      text.length > 20 &&
      text.length < 300 &&
      !text.includes("posts") &&
      !text.includes("followers") &&
      !text.includes("following") &&
      !text.includes("Following") &&
      !text.includes("Message") &&
      text !== displayName &&
      text !== handle &&
      !text.match(/^\d+$/)
    ) {
      if (!bio || text.length > bio.length) {
        bio = text;
      }
    }
  }

  const avatarElement = document.querySelector(
    'img[alt*="profile picture"]'
  ) as HTMLImageElement;
  const profileImageUrl = avatarElement?.src || "";

  const isVerified = !!document.querySelector('svg[aria-label="Verified"]');

  let followersCount = "0";
  const followersLinks = document.querySelectorAll('a[href*="/followers/"]');
  for (const link of followersLinks) {
    const followersSpan = link.querySelector("span");
    if (
      followersSpan?.textContent?.includes("K") ||
      followersSpan?.textContent?.includes("M") ||
      followersSpan?.textContent?.match(/\d/)
    ) {
      const followersText = followersSpan.textContent.trim();
      followersCount = followersText.replace(/[^0-9KM.,]/g, "");
      break;
    }
  }

  let postsCount = "0";
  const postsElements = document.querySelectorAll("span");
  for (const span of postsElements) {
    const text = span.textContent?.trim() || "";
    if (text.includes("posts") && text.match(/\d/)) {
      const numericMatch = text.match(/([0-9,]+)/);
      if (numericMatch) {
        postsCount = numericMatch[1].replace(/,/g, "");
        break;
      }
    }
  }

  const igWebsites = [
    "instagram.com",
    "threads.com",
    "facebook.com",
    "meta.com",
    "meta.ai"
  ];
  const websiteLinks = Array.from(document.querySelectorAll('a[href^="http"]'))
    .filter((link) => {
      const url = new URL((link as HTMLAnchorElement).href);
      const hostname = url.hostname;
      if (hostname === "l.instagram.com") return true;
      return !igWebsites.some(
        (domain) => hostname === domain || hostname.endsWith("." + domain)
      );
    })
    .map((link) => (link as HTMLAnchorElement).href);
  const websiteUrl = websiteLinks.length > 0 ? websiteLinks[0] : "";

  const label = displayName || handle;
  const text = `${label}\n@${handle}\n${bio}`.trim();

  return {
    url,
    label,
    text,
    body: {
      username: handle,
      bio,
      profileImageUrl
    },
    metadata: {
      displayName,
      followersCount,
      postsCount,
      websiteUrl
    },
    contentType: NodeType.INSTAGRAM_PROFILE
  };
}

function extractInstagramPostFromInlineClip(
  element: Element
): ISocialPost<IInstagramPost, IInstagramProfile> | undefined {
  const postArticle = findAncestorOrSelf(element, "article");
  if (!postArticle) return;
  const isPostPage = window.location.pathname.includes("/p/");
  const data = parseInstagramPost(postArticle);
  if (!data) return;
  return { ...data, isPostPage };
}

function parseInstagramPost(
  root: Element
): ISocialPostBase<IInstagramPost, IInstagramProfile> | undefined {
  const textElement = root.querySelector(
    '[data-lexical-text="true"]'
  ) as HTMLElement;
  let text = textElement?.innerText?.trim() ?? "";

  if (!text || text === "") {
    const fallbackTextElement = root.querySelector(
      'div[style*="display: inline"]'
    ) as HTMLElement;
    text = fallbackTextElement?.innerText?.trim() ?? "";
  }
  const timeElement = root.querySelector("time");
  const postedAtStr =
    timeElement?.getAttribute("datetime") ??
    timeElement?.textContent?.trim() ??
    "";
  const authorLink = root.querySelector('a[href*="/"]') as HTMLAnchorElement;

  const profileImageElement = root.querySelector(
    'img[alt*="profile picture"]'
  ) as HTMLImageElement;
  const profileImageUrl = profileImageElement?.src ?? "";

  const isVerified = !!root.querySelector('svg[aria-label="Verified"]');
  const postLink = root.querySelector('a[href*="/p/"]') as HTMLAnchorElement;
  const postUrl = postLink?.href ?? window.location.href;
  const postId =
    postUrl.match(/\/p\/([A-Za-z0-9_-]+)/)?.[1] ??
    `unknown_${generateRandomIdv2()}`;

  let authorHandle = "unknown";
  if (authorLink?.href) {
    const usernameMatch = authorLink.href.match(
      /(?:instagram\.com\/|\/)([^/?]+)\/?$/
    );
    if (
      usernameMatch &&
      usernameMatch[1] !== "www.instagram.com" &&
      usernameMatch[1] !== "instagram.com"
    ) {
      authorHandle = usernameMatch[1];
    } else {
      const pathname = new URL(authorLink.href).pathname;
      const pathSegments = pathname.split("/").filter(Boolean);
      if (pathSegments.length > 0) {
        authorHandle = pathSegments[pathSegments.length - 1];
      }
    }
  }
  const authorUrl = authorLink
    ? new URL(authorLink.href, window.location.origin).toString()
    : undefined;

  const likesElement = root.querySelector(
    'a[href*="/liked_by/"], a[href$="/liked_by"]'
  );
  const likesText = likesElement?.textContent?.trim();
  const likes = likesText?.replace(/[^0-9,]/g, "") ?? "0";

  const links = Array.from(root.querySelectorAll('a[href^="http"]'))
    .map((a: any) => a.href)
    .filter(
      (href: string) =>
        !href.includes("/p/") &&
        !href.includes("instagram.com/") &&
        href !== window.location.href
    );

  const videoElement = root.querySelector("video");
  const imageElements = root.querySelectorAll(
    'img:not([alt*="profile picture"])'
  );
  const media: string[] = [];

  if (videoElement?.src) {
    media.push(videoElement.src);
  }

  imageElements.forEach((img) => {
    const imgElement = img as HTMLImageElement;
    if (
      imgElement.src &&
      !imgElement.alt?.includes("profile") &&
      imgElement.src.includes("fbcdn.net")
    ) {
      media.push(imgElement.src);
    }
  });

  const data: OmitForCapture<IInstagramPost> = {
    contentType: NodeType.INSTAGRAM_POST,
    label: "",
    text,
    body: {
      postedAt:
        postedAtStr && !isNaN(new Date(postedAtStr).getTime())
          ? new Date(postedAtStr).getTime()
          : 0,
      links
    },
    metadata: {
      postId,
      username: authorHandle,
      postedAt: postedAtStr,
      media,
      likes,
      isVerified
    },
    url: postUrl
  };

  const parent: OmitForCapture<IInstagramProfile> = {
    contentType: NodeType.INSTAGRAM_PROFILE,
    label: authorHandle,
    text: `@${authorHandle}`,
    body: {
      username: authorHandle,
      profileImageUrl
    },
    url: authorUrl ?? ""
  };

  return {
    data,
    parent
  };
}

function extractInstagramPostFromPage():
  | ISocialPost<IInstagramPost, IInstagramProfile>
  | undefined {
  const postId = window.location.pathname.split("/p/")[1]?.split("/")[0];
  if (!postId) return;
  const mainContainer = document.querySelector("main");
  const articleContainer = mainContainer
    ?.querySelector("div")
    ?.querySelector("div");
  if (!mainContainer || !articleContainer) {
    return {
      data: {
        contentType: NodeType.INSTAGRAM_POST,
        label: "",
        text: "",
        body: {
          postedAt: 0
        },
        metadata: {
          postId: postId,
          username: "unknown"
        },
        url: window.location.href
      },
      parent: {
        contentType: NodeType.INSTAGRAM_PROFILE,
        label: "",
        text: "",
        body: {
          username: "unknown",
          profileImageUrl: ""
        },
        url: window.location.href
      }
    };
  }
  return parseInstagramPostFromPage(articleContainer);
}

function parseInstagramPostFromPage(
  root: Element
): ISocialPostBase<IInstagramPost, IInstagramProfile> | undefined {
  console.log({ at: "parseInstagramPostFromPage", root });
  const textElements = root.querySelectorAll(
    'span[style*="line-height: 18px"]'
  );
  let text = "";

  for (const element of textElements) {
    const elementText = element.textContent?.trim() ?? "";
    if (
      elementText.length > text.length &&
      elementText.length > 15 &&
      !elementText.includes("likes") &&
      !elementText.includes("ago") &&
      !elementText.includes("•") &&
      !elementText.match(/^\d+[smhd]$/) &&
      !elementText.match(/^@\w+$/)
    ) {
      text = elementText;
    }
  }

  const timeElement = root.querySelector("time");
  const postedAtStr =
    timeElement?.getAttribute("datetime") ??
    timeElement?.textContent?.trim() ??
    "";

  let authorName = "";
  let authorHandle = "";
  const profileLinks = root.querySelectorAll('a[href*="/"]');
  for (const link of profileLinks) {
    const href = (link as HTMLAnchorElement).href;
    const usernameMatch = href.match(/instagram\.com\/([^/?]+)/);
    if (usernameMatch && usernameMatch[1] !== "p") {
      authorHandle = usernameMatch[1];
      authorName = authorHandle;
      break;
    }
  }

  const profileImageElement = root.querySelector(
    'img[alt*="profile picture"]'
  ) as HTMLImageElement;
  const profileImageUrl = profileImageElement?.src ?? "";

  const isVerified = !!root.querySelector('svg[aria-label="Verified"]');

  const postUrl = window.location.href;
  const postId =
    postUrl.match(/\/p\/([A-Za-z0-9_-]+)/)?.[1] ??
    `unknown_${generateRandomIdv2()}`;

  const authorUrl = `https://www.instagram.com/${authorHandle}/`;

  let likes = "0";
  const likesElements = root.querySelectorAll("span");
  for (const span of likesElements) {
    const spanText = span.textContent?.trim() ?? "";
    if (spanText.includes("likes") && spanText.match(/\d/)) {
      const numericMatch = spanText.match(/([0-9,]+)/);
      if (numericMatch) {
        likes = numericMatch[1].replace(/,/g, "");
      }
      break;
    }
  }

  const links = Array.from(root.querySelectorAll('a[href^="http"]'))
    .map((a: any) => a.href)
    .filter(
      (href: string) =>
        !href.includes("/p/") &&
        !href.includes("instagram.com/") &&
        href !== window.location.href
    );

  const media: string[] = [];

  const videoElements = root.querySelectorAll("video");
  videoElements.forEach((video) => {
    if (video.src && !video.src.startsWith("blob:")) {
      media.push(video.src);
    }
  });

  const imageElements = root.querySelectorAll(
    'img:not([alt*="profile picture"]):not([alt*="avatar"])'
  );
  imageElements.forEach((img) => {
    const imgElement = img as HTMLImageElement;
    if (
      imgElement.src &&
      imgElement.src.includes("fbcdn.net") &&
      !imgElement.alt?.toLowerCase().includes("profile") &&
      !imgElement.alt?.toLowerCase().includes("avatar")
    ) {
      media.push(imgElement.src);
    }
  });

  const data: OmitForCapture<IInstagramPost> = {
    contentType: NodeType.INSTAGRAM_POST,
    label: "",
    text,
    body: {
      postedAt:
        postedAtStr && !isNaN(new Date(postedAtStr).getTime())
          ? new Date(postedAtStr).getTime()
          : 0,
      links
    },
    metadata: {
      postId,
      username: authorHandle,
      postedAt: postedAtStr,
      media,
      likes,
      isVerified
    },
    url: postUrl
  };

  const parent: OmitForCapture<IInstagramProfile> = {
    contentType: NodeType.INSTAGRAM_PROFILE,
    label: authorName || authorHandle,
    text: `${authorName || authorHandle} @${authorHandle}`,
    body: {
      username: authorHandle,
      profileImageUrl
    },
    url: authorUrl
  };

  return {
    data,
    parent
  };
}

function extractRedditPostFromInlineClip(
  element: Element
): ISocialPost<IRedditPost, IRedditProfile> | undefined {
  const postArticle = findAncestorOrSelf(element, "article");
  if (!postArticle) return;
  const isPostPage = window.location.pathname.includes("/comments/");
  const data = parseRedditPost(postArticle);
  if (!data) return;
  return { ...data, isPostPage };
}

function parseRedditPost(
  root: Element
): ISocialPostBase<IRedditPost, IRedditProfile, IRedditSub> | undefined {
  let title = root.getAttribute("aria-label") || "";

  const textElement = root.querySelector(
    '[data-post-click-location="text-body"]'
  ) as HTMLElement;
  let text = textElement?.innerText?.trim() ?? "";

  if (!text) {
    const fallbackTextElement = root.querySelector(
      ".md, .usertext-body, [property='schema:articleBody']"
    ) as HTMLElement;
    text = fallbackTextElement?.innerText?.trim() ?? "";
  }

  const subredditLink = root.querySelector(
    'a[data-testid="subreddit-name"], a[href*="/r/"]'
  ) as HTMLAnchorElement;
  let subreddit = "unknown";
  if (subredditLink?.href) {
    const subredditMatch = subredditLink.href.match(/\/r\/([^/?]+)/);
    if (subredditMatch) {
      subreddit = subredditMatch[1];
    }
  }

  let username = "unknown";
  const authorElement = root.querySelector(
    "[author], [data-author]"
  ) as HTMLElement;
  if (authorElement) {
    username =
      authorElement.getAttribute("author") ||
      authorElement.getAttribute("data-author") ||
      authorElement.textContent?.trim() ||
      "unknown";
  } else {
    const authorSpan = root.querySelector(
      'span[id*="feed-post-credit-bar"] span'
    ) as HTMLElement;
    if (authorSpan?.textContent?.startsWith("u/")) {
      username = authorSpan.textContent.replace("u/", "");
    }
    const authorLink = root.querySelector(
      'a[href*="/user/"]'
    ) as HTMLAnchorElement;
    if (authorLink?.href) {
      username = authorLink.href.split("/user/")[1]?.split("/")[0] ?? "unknown";
    }
  }

  const timeElement = root.querySelector("faceplate-timeago") as HTMLElement;
  let postedAtStr = "";
  if (timeElement) {
    const timeEl = timeElement.querySelector("time");
    postedAtStr =
      timeEl?.getAttribute("datetime") ?? timeEl?.textContent?.trim() ?? "";
  }

  let postId = "";
  const postUrl = window.location.href;
  const postIdMatch = postUrl.match(/\/comments\/([a-zA-Z0-9]+)/);
  if (postIdMatch) {
    postId = postIdMatch[1];
  }
  const postElement =
    root.nodeName === "SHREDDIT-POST"
      ? root
      : root.querySelector("shreddit-post");
  if (postElement) {
    if (!postId || postId === "")
      postId = postElement.id
        ? postElement.id.replace("t3_", "")
        : postElement.permalink.match(/\/comments\/([a-zA-Z0-9]+)/)?.[1] ??
          `unknown_${generateRandomIdv2()}`;
    if (!title || title === "") {
      title = postElement.getAttribute("post-title") ?? "";
    }
  }

  const scoreElement = root.querySelector(
    "[score], [data-score]"
  ) as HTMLElement;
  let upvotes = "0";
  if (scoreElement) {
    upvotes =
      scoreElement.getAttribute("score") ||
      scoreElement.getAttribute("data-score") ||
      scoreElement.textContent?.trim() ||
      "0";
  }

  let commentsCount = "0";
  const commentsElement = root.querySelector(
    "[comment-count], [data-comment-count]"
  ) as HTMLElement;
  if (commentsElement) {
    commentsCount =
      commentsElement.getAttribute("comment-count") ||
      commentsElement.getAttribute("data-comment-count") ||
      "0";
  }

  const flairElement = root.querySelector(
    ".post-flair, [data-flair-text]"
  ) as HTMLElement;
  const flair = flairElement?.textContent?.trim() || undefined;

  let domain = "self." + subreddit;
  const domainElement = root.querySelector(
    "[domain], [data-domain]"
  ) as HTMLElement;
  if (domainElement) {
    domain =
      domainElement.getAttribute("domain") ||
      domainElement.getAttribute("data-domain") ||
      domain;
  }

  const links = Array.from(root.querySelectorAll('a[href^="http"]'))
    .map((a: any) => a.href)
    .filter(
      (href: string) =>
        !href.includes("reddit.com/") &&
        !href.includes("redd.it/") &&
        href !== window.location.href
    );

  const finalPostUrl = postUrl.includes("/comments/")
    ? postUrl
    : `https://www.reddit.com/r/${subreddit}/comments/${postId}/`;

  const data: OmitForCapture<IRedditPost> = {
    contentType: NodeType.REDDIT_POST,
    label: title,
    text: text || title,
    body: {
      postedAt:
        postedAtStr && !isNaN(new Date(postedAtStr).getTime())
          ? new Date(postedAtStr).getTime()
          : 0,
      links
    },
    metadata: {
      postId,
      subreddit,
      username,
      postedAt: postedAtStr,
      upvotes,
      commentsCount,
      flair,
      domain
    },
    url: finalPostUrl
  };

  const parent: OmitForCapture<IRedditProfile> = {
    contentType: NodeType.REDDIT_PROFILE,
    label: username,
    text: `u/${username}`,
    body: {
      username,
      bio: "",
      profileImageUrl: ""
    },
    url: `https://www.reddit.com/user/${username}/`
  };

  const sub: OmitForCapture<IRedditSub> = {
    contentType: NodeType.REDDIT_SUB,
    label: subreddit,
    text: `r/${subreddit}`,
    body: {
      username: subreddit,
      bio: "",
      profileImageUrl: ""
    },
    url: `https://www.reddit.com/r/${subreddit}/`
  };

  return {
    data,
    parent,
    sub
  };
}

function extractRedditPostFromPage():
  | ISocialPost<IRedditPost, IRedditProfile, IRedditSub>
  | undefined {
  const postId = window.location.pathname.split("/comments/")[1]?.split("/")[0];
  if (!postId) return;
  const postArticle = document.querySelector(
    `article[id*="${postId}"], [data-ks-id*="${postId}"], shreddit-post`
  );

  if (!postArticle) {
    const articles = document.querySelectorAll("article");
    const targetArticle = Array.from(articles).find(
      (article) =>
        article.getAttribute("aria-label") ||
        article.querySelector('[id*="post-rtjson-content"]')
    );
    if (targetArticle) {
      return parseRedditPost(targetArticle);
    }
    return;
  }

  return parseRedditPost(postArticle);
}

function extractFacebookPostFromPage():
  | ISocialPost<IFacebookPost, IFacebookProfile>
  | undefined {
  const csui = document.querySelector(
    `${csuiSelector}#memotron-clipper-facebook-root`
  );
  if (!csui) return;
  const postContainer = resolveParentNLevel(4, csui);
  if (postContainer) {
    return parseFacebookPost(postContainer as Element);
  }
}

function extractFacebookPostFromInlineClip(
  element: Element
): ISocialPost<IFacebookPost, IFacebookProfile> | undefined {
  let postContainer =
    findAncestorOrSelf(element, '[role="article"]') ||
    findAncestorOrSelf(element, 'div[data-pagelet*="FeedUnit"]');
  if (!postContainer) {
    const csui = findAncestorOrSelf(element, csuiSelector);
    postContainer = resolveParentNLevel(4, csui);
  }
  const isPostPage =
    window.location.pathname.includes("/posts/") ||
    window.location.pathname.includes("/photo.php") ||
    window.location.pathname.includes("/permalink.php");
  const data = parseFacebookPost(postContainer);
  if (!data) return;
  return { ...data, isPostPage };
}

function parseFacebookPost(
  root: Element
): ISocialPostBase<IFacebookPost, IFacebookProfile> | undefined {
  let text = "";
  let textElement = root.querySelector(
    '[data-ad-rendering-role="story_message"]'
  );
  if (!textElement) root.querySelector('[data-testid="post_message"]');
  text = textElement?.textContent?.trim() ?? "";

  let authorName = "";
  let authorHandle = "";
  let profileImageUrl = "";

  const authorElements = [
    root.querySelector('strong[data-ad-rendering-role="profile_name"]'),
    root.querySelector('a[data-testid="event_title_link"] strong'),
    root.querySelector("h3 a"),
    root.querySelector("h4 a"),
    root.querySelector('[data-testid="story-subtitle"] a'),
    root.querySelector('span[data-testid="event_title_link"] strong')
  ];

  for (const authorEl of authorElements) {
    if (authorEl?.textContent?.trim()) {
      authorName = authorEl.textContent.trim();
      const authorLink = authorEl.closest("a");
      if (authorLink?.href) {
        const profileMatch = authorLink.href.match(/facebook\.com\/([^/?]+)/);
        if (
          profileMatch &&
          profileMatch[1] !== "photo.php" &&
          profileMatch[1] !== "permalink.php"
        ) {
          authorHandle = profileMatch[1];
        }
      }
      break;
    }
  }

  const profileImageEl = root.querySelector(
    'img[data-testid*="profile"], img[alt*="profile"]'
  ) as HTMLImageElement;
  if (profileImageEl?.src) {
    profileImageUrl = profileImageEl.src;
  }

  const timeElements = root.querySelectorAll(
    'time, [data-testid="story-subtitle"] span'
  );
  let postedAtStr = "";
  for (const timeEl of timeElements) {
    const datetime = timeEl.getAttribute("datetime");
    if (datetime) {
      postedAtStr = datetime;
      break;
    }
    const timeText = timeEl.textContent?.trim();
    if (
      timeText &&
      (timeText.includes("h") ||
        timeText.includes("min") ||
        timeText.includes("d"))
    ) {
      postedAtStr = timeText;
      break;
    }
  }

  let reactions = "";
  let likes = "";
  let shares = "";
  let comments = "";

  const reactionElements = root.querySelectorAll(
    '[aria-label*="reaction"], [aria-label*="people"], [data-testid*="reaction"]'
  );
  reactionElements.forEach((el) => {
    const ariaLabel = el.getAttribute("aria-label") || "";
    const text = el.textContent?.trim() || "";

    if (
      ariaLabel.toLowerCase().includes("like") ||
      text.toLowerCase().includes("like")
    ) {
      const match = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KM]?)/g);
      if (match) likes = match[0];
    }
    if (
      ariaLabel.toLowerCase().includes("comment") ||
      text.toLowerCase().includes("comment")
    ) {
      const match = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KM]?)/g);
      if (match) comments = match[0];
    }
    if (
      ariaLabel.toLowerCase().includes("share") ||
      text.toLowerCase().includes("share")
    ) {
      const match = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KM]?)/g);
      if (match) shares = match[0];
    }
  });

  const allReactionsEl = root.querySelector('[aria-label*="All reactions:"]');
  if (allReactionsEl?.textContent) {
    const match = allReactionsEl.textContent.match(
      /(\d+(?:,\d+)*(?:\.\d+)?[KM]?)/g
    );
    if (match) reactions = match[0];
  }

  const links = Array.from(root.querySelectorAll('a[href^="http"]'))
    .map((a: any) => a.href)
    .filter(
      (href: string) =>
        !href.includes("facebook.com/") &&
        !href.includes("instagram.com/") &&
        href !== window.location.href
    );

  const media: string[] = [];
  const imageElements = root.querySelectorAll(
    'img:not([alt*="profile"]):not([data-testid*="profile"])'
  );
  imageElements.forEach((img) => {
    const imgElement = img as HTMLImageElement;
    if (
      imgElement.src &&
      imgElement.src.includes("fbcdn.net") &&
      !imgElement.src.includes("profile")
    ) {
      media.push(imgElement.src);
    }
  });

  const videoElements = root.querySelectorAll("video");
  videoElements.forEach((video) => {
    if (video.src && !video.src.startsWith("blob:")) {
      media.push(video.src);
    }
  });

  let postId = "";
  let postUrl = "";
  const currentUrl = window.location.href;
  if (currentUrl.includes("/posts/")) {
    const postIdMatch = currentUrl.match(/\/posts\/([^/?]+)/);
    if (postIdMatch) postId = postIdMatch[1];
    postUrl = currentUrl.split("?")[0];
  } else if (currentUrl.includes("story_fbid=")) {
    const storyIdMatch = currentUrl.match(/story_fbid=([^&]+)/);
    if (storyIdMatch) postId = storyIdMatch[1];
  } else if (currentUrl.includes("fbid=")) {
    const fbidMatch = currentUrl.match(/fbid=([^&]+)/);
    if (fbidMatch) postId = fbidMatch[1];
  }

  const authorUrl = authorHandle
    ? `https://www.facebook.com/${authorHandle}`
    : "";
  const username = authorHandle || "unknown";

  const data: OmitForCapture<IFacebookPost> = {
    contentType: NodeType.FACEBOOK_POST,
    label: "",
    text,
    body: {
      postedAt:
        postedAtStr && !isNaN(new Date(postedAtStr).getTime())
          ? new Date(postedAtStr).getTime()
          : 0,
      links
    },
    metadata: {
      postId,
      username,
      postedAt: postedAtStr,
      media,
      externalLinks: links,
      likes,
      reactions,
      shares,
      comments
    },
    url: postUrl
  };

  const parent: OmitForCapture<IFacebookProfile> = {
    contentType: NodeType.FACEBOOK_PROFILE,
    label: authorName || username,
    text: `${authorName || username} on Facebook`,
    body: {
      username,
      bio: "",
      profileImageUrl
    },
    url: authorUrl
  };

  return {
    data,
    parent
  };
}

function extractMastodonPostFromPage():
  | ISocialPost<IMastodonPost, IMastodonProfile>
  | undefined {
  const article = document.querySelector(`.detailed-status__wrapper`);
  if (!article) return;

  return parseMastodonPost(article, true);
}

function extractMastodonPostFromInlineClip(
  element: Element
): ISocialPost<IMastodonPost, IMastodonProfile> | undefined {
  let article = findAncestorOrSelf(element, "article[data-id]");
  let isPostPage = false;
  if (!article) {
    article = findAncestorOrSelf(element, ".status-reply");
    if (!article) article = findAncestorOrSelf(element, ".status--in-thread");
    if (article) isPostPage = true;
  }
  if (!article) return;
  isPostPage =
    window.location.pathname.includes("/@") &&
    /\/\d+$/.test(window.location.pathname);

  const data = parseMastodonPost(article);
  if (!data) return;

  return { ...data, isPostPage };
}

function parseMastodonPost(
  root: Element,
  isMainPost: boolean = false
): ISocialPostBase<IMastodonPost, IMastodonProfile> | undefined {
  let postId = root.getAttribute("data-id");
  if (!postId && isMainPost)
    postId = window.location.pathname.split("/").pop() ?? null;
  if (!postId || !/^\d+$/.test(postId)) return;

  const textElement = root.querySelector(".status__content__text");
  const text = textElement?.textContent?.trim() || "";

  const authorLink = (root.querySelector(".status__display-name") ||
    root.querySelector(".detailed-status__display-name")) as HTMLAnchorElement;
  const authorName =
    authorLink?.querySelector("strong")?.textContent?.trim() || "";
  const authorUsername =
    authorLink
      ?.querySelector(".display-name__account")
      ?.textContent?.trim()
      .replace("@", "") ||
    authorLink?.href.split("/@").pop() ||
    "";

  const avatarImg = root.querySelector(
    ".account__avatar img"
  ) as HTMLImageElement;
  const profileImageUrl = avatarImg?.src || "";

  const timeElement = root.querySelector("time");
  const postedAtStr =
    timeElement?.getAttribute("datetime") ||
    timeElement?.textContent?.trim() ||
    "";

  const mediaImages = Array.from(root.querySelectorAll(".media-gallery img"))
    .map((img: any) => img.src)
    .filter(Boolean);

  const links = Array.from(
    root.querySelectorAll('.status__content a[href^="http"]')
  )
    .map((a: any) => a.href)
    .filter((href: string) => {
      const url = new URL(href);
      return !href.includes("/@") && !href.includes("/web/statuses/");
    });

  const replyCount =
    root
      .querySelector(".status__action-bar .icon-button__counter")
      ?.textContent?.trim() || "0";
  const visibility =
    root.querySelector(".status__visibility-icon")?.getAttribute("title") ||
    "public";

  const authorUrl = authorLink?.href;
  const postUrl = `${authorUrl}/${postId}`;

  const data: OmitForCapture<IMastodonPost> = {
    contentType: NodeType.MASTODON_POST,
    text,
    label: "",
    body: {
      postedAt:
        postedAtStr && !isNaN(new Date(postedAtStr).getTime())
          ? new Date(postedAtStr).getTime()
          : 0,
      links
    },
    metadata: {
      postId,
      username: authorUsername,
      postedAt: postedAtStr,
      media: mediaImages,
      externalLinks: links,
      replies: replyCount,
      visibility
    },
    url: postUrl
  };

  const parent: OmitForCapture<IMastodonProfile> = {
    contentType: NodeType.MASTODON_PROFILE,
    label: authorName || authorUsername,
    text: `${authorName} @${authorUsername}`,
    body: {
      username: authorUsername,
      profileImageUrl
    },
    url: authorUrl
  };

  return {
    data,
    parent
  };
}

export function extractMastodonProfile(): OmitForCapture<IMastodonProfile> {
  const url = window.location.href;
  const username = url.split("/@")[1]?.split("/")[0] || "";

  const root = findAncestorOrSelf(
    document.querySelector(
      `${csuiSelector}#memotron-clipper-mastodonprofile-root`
    ),
    ".account__header"
  );
  console.log({ at: "extractMastodonProfile", root });

  const displayNameElement = root.querySelector("h1 span");
  const displayName = displayNameElement?.textContent?.trim() || "";

  const bioElement = root.querySelector(".account__header__content");
  const bio = bioElement?.textContent?.trim() || "";

  const avatarElement = root.querySelector(
    ".account__avatar img"
  ) as HTMLImageElement;
  const profileImageUrl = avatarElement?.src || "";

  const headerElement = root.querySelector(
    ".account__header img"
  ) as HTMLImageElement;
  const bannerImageUrl = headerElement?.src || "";

  const followersElement = root.querySelector('[href$="/followers"]');
  const followersCount =
    followersElement?.title || followersElement?.textContent?.trim() || "0";

  const followingElement = root.querySelector('[href$="/following"]');
  const followingCount =
    followingElement?.title || followingElement?.textContent?.trim() || "0";

  const postsElement = root.querySelector(
    ".account__header__extra__links > a:first-child"
  );
  const postsCount =
    postsElement?.title || postsElement?.textContent?.trim() || "0";

  const label = displayName || username;
  const text = `${label}\n@${username}\n${bio}`.trim();

  return {
    url,
    label,
    text,
    body: {
      username,
      bio,
      profileImageUrl
    },
    metadata: {
      displayName,
      followersCount,
      followingCount,
      postsCount,
      bannerImageUrl
    },
    contentType: NodeType.MASTODON_PROFILE
  };
}

export function extractFacebookProfile(): OmitForCapture<IFacebookProfile> {
  const url = window.location.href;
  let username = "";
  let name = "";
  const saveButton = document.querySelector(
    `${csuiSelector}#memotron-clipper-facebookprofile-root`
  ) as Element;
  const root = resolveParentNLevel(6, saveButton);
  const header = root?.querySelector("h1");
  console.log({ at: "extractFacebookProfile", root, header });

  if (url.includes("profile.php?id=")) {
    const idMatch = url.match(/profile\.php\?id=(\d+)/);
    if (idMatch) username = idMatch[1];
  } else {
    const usernameMatch = url.match(/facebook\.com\/([^/?]+)/);
    if (usernameMatch) username = usernameMatch[1];
  }
  name = header?.textContent?.trim() ?? "";

  const bioElements = [
    document.querySelector('[data-testid="profile_bio"]'),
    document.querySelector(".profileIntroCard"),
    document.querySelector("#intro_container_id")
  ];

  let bio = "";
  for (const bioEl of bioElements) {
    if (bioEl?.textContent?.trim()) {
      const bioText = bioEl.textContent.trim();
      if (bioText.length > bio.length && bioText.length > 10) {
        bio = bioText;
      }
    }
  }

  const profileImageElements = [
    document.querySelector('image[data-testid="profile_photo"]'),
    document.querySelector('img[data-testid="profile_photo"]'),
    document.querySelector('img[alt*="profile picture"]')
  ] as HTMLImageElement[];

  let profileImageUrl = "";
  for (const imgEl of profileImageElements) {
    if (imgEl?.src) {
      profileImageUrl = imgEl.src;
      break;
    }
  }

  const text = `${name}\n${bio}`.trim();

  return {
    url,
    label: name || username,
    text,
    body: {
      username,
      bio,
      profileImageUrl
    },
    metadata: {
      displayName: name
    },
    contentType: NodeType.FACEBOOK_PROFILE
  };
}

const parserMap = new Map<NodeType, IWebpageParser>([
  [NodeType.TWEET, extractTweetFromTweeetPage],
  [NodeType.TWITTER_PROFILE, extractTwitterProfile],
  [NodeType.LINKEDIN_POST, extractLinkedInPostFromPage],
  [NodeType.LINKEDIN_PROFILE, extractLinkedInProfile],
  [NodeType.BLUESKY_POST, extractBskyPostFromPage],
  [NodeType.BLUESKY_PROFILE, extractBlueskyProfile],
  [NodeType.THREADS_POST, extractThreadsPostFromPage],
  [NodeType.THREADS_PROFILE, extractThreadsProfile],
  [NodeType.INSTAGRAM_POST, extractInstagramPostFromPage],
  [NodeType.INSTAGRAM_PROFILE, extractInstagramProfileFromPage],
  [NodeType.REDDIT_POST, extractRedditPostFromPage],
  [NodeType.FACEBOOK_POST, extractFacebookPostFromPage],
  [NodeType.FACEBOOK_PROFILE, extractFacebookProfile],
  [NodeType.MASTODON_POST, extractMastodonPostFromPage],
  [NodeType.MASTODON_PROFILE, extractMastodonProfile]
]);

const inlineSocialPostParserMap = new Map<NodeType, ISocialPostParser>([
  [NodeType.TWEET, extractTweetFromInlineClip],
  [NodeType.LINKEDIN_POST, extractLinkedInPostFromInlineClip],
  [NodeType.BLUESKY_POST, extractBskyPostFromInlineClip],
  [NodeType.THREADS_POST, extractThreadsPostFromInlineClip],
  [NodeType.INSTAGRAM_POST, extractInstagramPostFromInlineClip],
  [NodeType.REDDIT_POST, extractRedditPostFromInlineClip],
  [NodeType.FACEBOOK_POST, extractFacebookPostFromInlineClip],
  [NodeType.MASTODON_POST, extractMastodonPostFromInlineClip]
]);

export function resolveParser(
  contentType: NodeType
): IWebpageParser | undefined {
  if (!parserMap.has(contentType)) return;
  return parserMap.get(contentType);
}

export function resolveInlineSocialPostParser(
  contentType: NodeType
): ISocialPostParser | undefined {
  if (!inlineSocialPostParserMap.has(contentType)) return;
  return inlineSocialPostParserMap.get(contentType);
}
