import { ExtensionEvent, type TabData } from "$lib/client/types/extension.type";
import { sendMessageToContentScript } from "$lib/client/utils/extension.utils";
import * as CryptoJS from "crypto-js";

export function isYoutubeVideoUrl(url) {
    const regex = /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/;
    return regex.test(url);
}

export function extractVideoId(url) {
    const match = url.match(/^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    return match ? match[2] : null;
}


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
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M10.9931 19.1996L2.58332 5.92103C2.33031 5.52154 2.61734 5 3.09021 5H19.9098C20.3827 5 20.6697 5.52154 20.4167 5.92103L12.0069 19.1996C11.7713 19.5716 11.2287 19.5716 10.9931 19.1996Z" fill="#B4D7FF"/>
                         </svg>
                           `;
    pointer.style.backgroundSize = 'contain';
    pointer.style.backgroundRepeat = 'no-repeat';
    pointer.style.width = '20px'; 
    pointer.style.height = '20px';

    pointer.style.position = 'absolute';
    pointer.style.bottom = '60px';

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
      const data = await sendMessageToContentScript(
        { event: ExtensionEvent.READ_PAGE_CONTENT },
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
  export function extractFullTabData(): TabData {
    const bodyContent = document.body.innerHTML;
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
    const ogImage = (
      document.querySelector("meta[property='og:image']") as HTMLMetaElement
    )?.content;
    const ogTitle = (
      document.querySelector("meta[property='og:title']") as HTMLMetaElement
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
    const twitterCard = (
      document.querySelector("meta[name='twitter:card']") as HTMLMetaElement
    )?.content;
    const hash = CryptoJS.SHA256(bodyContent).toString();
    return {
      url: window.location.href,
      hash,
      label: title,
      description,
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
  