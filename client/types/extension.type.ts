export enum ExtensionEvent {
    TAB_CHANGE = "TAB_CHANGE",
    TAB_UPDATE = "TAB_UPDATE",
    CLICK_SIDEBAR = "CLICK_SIDEBAR",
    READ_PAGE_CONTENT = "READ_PAGE_CONTENT",
    SCREENSHOT= "SCREENSHOT",
    UPLOAD_TO_S3_USING_UPLOAD_URL= "UPLOAD_TO_S3_USING_UPLOAD_URL",
}


export type TabBaseData = {
    url: string;
    label: string;
    description?: string;
}

/**
 * @deprecated - use IWebPageNode instead
 */
export type TabData = TabBaseData & {
    metadata: TabMetadata;
    hash?: string;
    bodyContent?: string;
};


/**
 * @deprecated - use IWebPageMetadata instead
 */
export type TabMetadata = {
    favicon?: string;
    faviconLink?: string;
    appIconLinks?: string[];
    keywords?: string;
    hostname?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogUrl?: string;
    twitterCard?: string;
}