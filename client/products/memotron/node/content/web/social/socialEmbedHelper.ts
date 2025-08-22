import { Persistence } from "$lib/client/persistence/persistence";
import { parse } from "$lib/shared/utils/json.utils";

export interface EmbedOptions {
  postUrl: string;
  platform: string;
  oembedEndpoint?: string;
  extractId?: (url: string) => string | null;
  iframeTemplate?: (id: string, url: string) => string;
}

export interface EmbedResult {
  html?: string;
  success: boolean;
  error?: string;
}

export class SocialEmbedHelper {
  private options: EmbedOptions;
  private dispatch: (event: string, data: any) => void;

  constructor(options: EmbedOptions, dispatch: (event: string, data: any) => void) {
    this.options = options;
    this.dispatch = dispatch;
  }

  async tryOEmbedApproach(): Promise<EmbedResult> {
    if (!this.options.oembedEndpoint) {
      return { success: false, error: "No oEmbed endpoint provided" };
    }

    try {
      const oembedUrl = `${this.options.oembedEndpoint}?url=${encodeURIComponent(this.options.postUrl)}`;
      
      const urlData = await new Persistence().retrieveUrlData(oembedUrl, {
        isReturnRawData: true
      });

      if (urlData) {
        const data = parse(urlData.text);
        
        if (data && data.error) {
          this.dispatch("error", data.error);
          return { success: false, error: data.error };
        } else if (data && data.html) {
          return { success: true, html: data.html };
        }
      }
    } catch (err) {
      console.warn(`${this.options.platform} oEmbed failed:`, err);
    }
    
    return { success: false, error: `Failed to load ${this.options.platform} post via oEmbed` };
  }

  async tryIframeApproach(): Promise<EmbedResult> {
    if (!this.options.extractId || !this.options.iframeTemplate) {
      return { success: false, error: "No iframe configuration provided" };
    }

    try {
      const postId = this.options.extractId(this.options.postUrl);
      
      if (!postId) {
        return { success: false, error: `Invalid ${this.options.platform} URL` };
      }

      const iframeHtml = this.options.iframeTemplate(postId, this.options.postUrl);
      return { success: true, html: iframeHtml };
    } catch (err) {
      console.warn(`${this.options.platform} iframe approach failed:`, err);
      return { success: false, error: `Failed to create ${this.options.platform} iframe` };
    }
  }

  async loadEmbed(): Promise<EmbedResult> {
    // Try oEmbed first if available
    if (this.options.oembedEndpoint) {
      const oembedResult = await this.tryOEmbedApproach();
      if (oembedResult.success) {
        return oembedResult;
      }
    }

    // Fall back to iframe if available
    if (this.options.extractId && this.options.iframeTemplate) {
      const iframeResult = await this.tryIframeApproach();
      if (iframeResult.success) {
        return iframeResult;
      }
    }

    return { 
      success: false, 
      error: `Unable to load ${this.options.platform} post` 
    };
  }
}

// Platform-specific configurations
export const SOCIAL_EMBED_CONFIGS = {
  bluesky: {
    oembedEndpoint: "https://embed.bsky.app/oembed",
    extractId: (url: string) => {
      const match = url.match(/bsky\.app\/profile\/[^/]+\/post\/([A-Za-z0-9]+)/);
      return match ? match[1] : null;
    },
    iframeTemplate: (id: string, url: string) => {
      const handle = url.match(/bsky\.app\/profile\/([^/]+)/)?.[1];
      return `
        <iframe 
          src="https://embed.bsky.app/embed/${handle}/app.bsky.feed.post/${id}" 
          width="400" 
          height="600" 
          style="max-width: 100%; border: 1px solid #ccc; border-radius: 8px;" 
          frameborder="0"
          allowfullscreen>
        </iframe>
      `;
    }
  },
  
  reddit: {
    oembedEndpoint: "https://www.reddit.com/oembed"
  },
  
  instagram: {
    oembedEndpoint: "https://api.instagram.com/oembed/"
  },
  
  threads: {
    oembedEndpoint: "https://www.threads.com/oembed"
  }
};
