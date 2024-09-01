import type { IResourceCapture } from "$lib/client/components/resourceStores/resource.type";
import { NodeType, type IClipCapture, type ITweet, type ITwitterProfile, type IWebPage,} from "$lib/client/products/memotron/node/node.type";
import { ExtensionEvent, type TabData } from "$lib/client/types/extension.type";
import { relayToContentScript } from "$lib/client/utils/extension.utils";
import { contentTypeMap } from "$lib/client/products/memotron/common/urlMap";
import { enumToString } from "$lib/shared/utils/text.utils";
import { logger } from "$lib/client/components/debug/logger.client";
import { ClipperElementIdentifier } from "$lib/client/products/memotron/common/clip.type";
import { generateHash } from "$lib/shared/utils/crypto.utils";

export function isYoutubeVideoUrl(url) {
    const regex = /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/;
    return regex.test(url);
}

export function extractVideoId(url) {
    const match = url.match(/^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    return match ? match[2] : null;
}

/**
 * @deprecated - using anchor and svelte component instead
 * @param controlElement 
 * @returns 
 */
export function createClipButton(controlElement) {
    const clipButton = document.createElement('button');
    clipButton.className = 'ytclip'; 
    clipButton.innerHTML = `
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                           <path d="M15.8103 5.45252L20.6058 5.00266C20.9096 4.97418 21.0723 5.17793 20.9688 5.45836C20.9688 5.45836 13.6738 17.2629 13.076 18.1115C12.4782 18.9602 11.9535 19.5909 10.8974 18.1115C9.84133 16.6322 3.03079 5.45836 3.03079 5.45836C2.92804 5.17793 3.09079 4.97418 3.39455 5.00266L8.19013 5.45252C8.49388 5.481 8.82314 5.73222 8.92364 6.01265C8.92364 6.01265 11.5 10.9796 12.0133 10.9796C12.5266 10.9796 15.0767 6.01338 15.0767 6.01338C15.1772 5.73222 15.5057 5.481 15.8103 5.45252Z" fill="white"/>
                          </svg>
                          `;

     const controlHeight = controlElement.offsetHeight;
     clipButton.style.padding = '0';
     clipButton.style.border = '1px solid #0056b3';
     clipButton.style.background = '#007bff';
     clipButton.style.height = '${controlHeight}px';
     clipButton.style.width = '${controlHeight}px';
     clipButton.style.borderRadius = '4px';
     clipButton.style.display = 'flex';
     clipButton.style.alignItems = 'center';
     clipButton.style.justifyContent = 'center';

      clipButton.addEventListener('mousedown', () => {
          clipButton.style.transform = 'scale(0.95)';
      });
      clipButton.addEventListener('mouseup', () => {
         clipButton.style.transform = 'scale(1)';
      });
      clipButton.addEventListener('mouseout', () => {
          clipButton.style.transform = 'scale(1)';
     });

     return clipButton;
}

export function createClipPointer() {
    const pointer = document.createElement('div');
    pointer.className = 'my-custom-pointer';
        
    pointer.innerHTML = `
                       <svg width="16" height="19" viewBox="0 0 16 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0.6 0H15.4C15.7314 0 16 0.26863 16 0.600001V13.1844C16 13.382 15.9027 13.5669 15.7399 13.6788L8.33992 18.7663C8.13517 18.9071 7.86483 18.9071 7.66008 18.7663L0.260083 13.6788C0.0972701 13.5669 0 13.382 0 13.1844V0.6C0 0.268629 0.26863 0 0.6 0Z" fill="#2c70dd"/>
          <path d="M0.6 0H15.4C15.7314 0 16 0.26863 16 0.600001V13.1844C16 13.382 15.9027 13.5669 15.7399 13.6788L8.33992 18.7663C8.13517 18.9071 7.86483 18.9071 7.66008 18.7663L0.260083 13.6788C0.0972701 13.5669 0 13.382 0 13.1844V0.6C0 0.268629 0.26863 0 0.6 0Z" fill="none" stroke="white" stroke-width="0" />
</svg>

                           `;
    pointer.style.backgroundSize = 'contain';
    pointer.style.backgroundRepeat = 'no-repeat';
    pointer.style.width = '20px'; 
    pointer.style.height = '20px';
    pointer.style.cursor = "pointer";
  pointer.style.position = 'absolute';
  pointer.style.zIndex = '10000';
  pointer.style.bottom = '70px';
  
  const path = pointer.querySelector('path');
  const strokePath = pointer.querySelectorAll('path')[1];
  path.style.transition = 'fill-opacity 0.2s';
  path.style.fillOpacity = '0.6';
  path.style.border = '1px solid transparent';
  strokePath.style.transition = 'stroke-width 0.2s';

    pointer.addEventListener('mouseenter', () => {
      path.style.fillOpacity = '1'; 
      pointer.style.bottom = '72px';
      strokePath.style.strokeWidth = '2';
    });

    pointer.addEventListener('mouseleave', () => {
      path.style.fillOpacity = '0.6';
      pointer.style.bottom = '70px';
      path.style.border = '1px solid transparent';
      strokePath.style.strokeWidth = '0';
    });

    return pointer;
}


export async function resolveCurrentTabData(
    isParseDOM: boolean = false
  ): Promise<TabData> {
    const tabData = await chrome.storage.local.get("tab");
    console.log({ tabData });
    const tab = tabData?.tab;
    if (!tab) return;
    let hash = "";
    if (!isParseDOM) {
      return {
        url: tab.url,
        label: tab.title,
        metadata: {
          favicon: tab.favIconUrl,
          hostname: new URL(tab.url).hostname
        }
      };
    }
    try {
      const data = await relayToContentScript(
        { event: ExtensionEvent.PAGE_STATE },
        tab.id
      );
      return {
        url: tab.url,
        label: tab.title,
        description: data.description,
        hash,
        metadata: {
          favicon: tab.favIconUrl,
          hostname: new URL(tab.url).hostname,
          ...data.metadata
        }
      };
    } catch (e) {
      console.error("ERROR", e);
    }
  }
  
/**
 * Extracts full tab data from the current tab.
 * Note: This function should be called only from the content script.
 * @returns TabData
 */
export function extractFullTabData(): IResourceCapture<IWebPage> {
  const title = document.title;
  const faviconLink = (
    document.querySelector("link[rel*='icon']") as HTMLLinkElement
  )?.href;
  const appIconLinks = Array.from(
    document.querySelectorAll("link[rel='apple-touch-icon']"),
    (link) => (link as HTMLLinkElement).href
  );
  const description = (
    document.querySelector("meta[name='description']") as HTMLMetaElement
  )?.content;
  const keywords = (
    document.querySelector("meta[name='keywords']") as HTMLMetaElement
  )?.content;
  const twitterCard = (
    document.querySelector("meta[name='twitter:card']") as HTMLMetaElement
  )?.content;
  const { ogTitle, ogImage, ogDescription, ogUrl } = resolveOgData();
  const hash = generateHash(document.body.innerHTML);
  const url = resolveUrl();
  const contentType = resolveContentTypeForUrl(url);
  return {
    label: title,
    contentType,
    body: {
      url,
      hash,
      description,
    },
    metadata: {
      faviconLink,
      appIconLinks,
      keywords,
      ogImage,
      ogTitle,
      ogDescription,
      ogUrl,
      twitterCard
    }
  };
}

export function extractMinimalTabData(): IResourceCapture<IWebPage> { 
  const title = document.title;
  const hash = generateHash(document.body.innerHTML);
  const { ogTitle, ogImage, ogDescription, ogUrl } = resolveOgData();
  const url = resolveUrl();
  const contentType = resolveContentTypeForUrl(url);
  logger.debug({ at: "extractMinimalTabData", url, contentType });
  return {
    metadata: { ogTitle, ogImage, ogDescription, ogUrl }, label: title, contentType, body: { url, hash }
  };
}


export function resolveUrl(url?: string) {
  if(!url) url = window.location.href;
  if (url.includes("youtube.com")) { 
    return url.split("&")[0]
  }
  return url;
}


function resolveOgData() {
  const ogTitle = (
    document.querySelector("meta[property='og:title']") as HTMLMetaElement
  )?.content
  const ogImage = (
    document.querySelector("meta[property='og:image']") as HTMLMetaElement
  )?.content;
  const ogDescription = (
    document.querySelector("meta[property='og:description']") as HTMLMetaElement
  )?.content;
  const ogUrl = (
    document.querySelector("meta[property='og:url']") as HTMLMetaElement
  )?.content;
  const ogSiteName = (
    document.querySelector("meta[property='og:site_name']") as HTMLMetaElement
  )?.content;
  return {ogTitle, ogImage, ogDescription, ogUrl, ogSiteName};
}



export function resolveContentTypeString(contentType: NodeType | null) {
  if (!contentType) return "webpage";
  else if (contentType === NodeType.WEB_SCREENSHOT_CLIP)
    return "screenshot";
  else return enumToString(contentType);
}

export function resolveContentTypeForUrl(url: string) {
  return contentTypeMap.find((item) => item.regex.some((regex) => regex.test(url)))?.contentType ?? NodeType.WEB_PAGE;
}



/**
 * 
 * Note: media is not currently included in the content of the tweet as it might require reuploading the media to s3 and using in the app.
 * 
 * @param tweetArticle 
 * @returns 
 */
function parseTweetContent(tweetArticle: Element): IClipCapture<
  ITweet & {
    username: string;
    profileUrl: string;
    authorName: string;
    profileImageUrl: string;
  }
> {
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
  const { ogTitle } = resolveOgData();

  logger.log({
    at: "parsedTweetContent",
    tweetContent,
    tweetLinks,
    tweetTime
  });
  const domain = contentTypeMap.find((item) => item.contentType === NodeType.TWEET)?.currentDomain;
  const {
    username,
    authorName,
    tweetId,
    externalLinks,
    profileImageUrl
  } = extractInfoFromLinks(tweetLinks);
  return {
    contentType: NodeType.TWEET,
    body: {
      url: `https://${domain}/${username}/status/${tweetId}`,
      content: tweetContent,
      postedAt: tweetTime[0]?.datetime
    },
    metadata: {
      tweetId,
      ogTitle,
      externalLinks
    },
    username,
    profileUrl: `https://${domain}/${username}`,
    authorName,
    profileImageUrl
  };

  function extractInfoFromLinks(data) {
    let username = "";
    let authorName = "";
    let tweetId = "";
    const currentUrl = window.location.pathname;

    const urlMatch = currentUrl.match(/\/(\w+)\/status\/(\d+)/);
    if (urlMatch) {
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

export function extractTweet(element) {
  const tweetArticle = findAncestorOrSelf(element, 'article[data-testid="tweet"]');
  if (!tweetArticle) return;
  return parseTweetContent(tweetArticle);

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

}

export function extractTweetFromTweeetPage() {
  const tweetElement = document.getElementById(
    ClipperElementIdentifier.MAIN_TWEET_POST
  );
  const tweetId = window.location.pathname.split("/status/")[1];
  const regex = new RegExp(tweetId, 'i');
  const allLinks = document.querySelectorAll('a');
  const element = Array.from(allLinks).find(link => regex.test(link.getAttribute('href')));
  if (!tweetElement && !element) return;
  return extractTweet(tweetElement ?? element);
}

/**
 * This function is triggered from twitter profile page.
 * @returns 
 */
export function extractTwitterProfile(): IClipCapture<ITwitterProfile & {
  username: string;
}> { 
  const url = window.location.href;
  const username = url.split("https://")[1].split("/")[1];
  const bioElement = document.querySelector('[data-testid="UserDescription"]');
  const nameElement = document.querySelector('[data-testid="UserName"]');
  const linkElement = document.querySelector('[data-testid="UserUrl"]');
  const avatarElement = document.querySelector(`[data-testid^="UserAvatar-Container-${username}"]`);
  const imgElement = avatarElement?.querySelector('img');
  const profileImageUrl = imgElement?.src;
  const { ogTitle } = resolveOgData();
  const name = nameElement?.textContent?.split("@")[0];
  const bio = bioElement?.textContent;
  const bioLink = linkElement?.href;
  const bioLinkText = linkElement?.textContent;
  return { body: { name, bio, url, profileImageUrl }, metadata:{ ogTitle, bioLink, bioLinkText }, username, contentType: NodeType.TWITTER_PROFILE };
}

