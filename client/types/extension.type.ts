export enum ExtensionEvent {
    /**
     * A tab change event - sent from background script.
     */
    TAB_CHANGE = "TAB_CHANGE",
    /**
     * A tab update event - sent from background script.
     */
    TAB_UPDATE = "TAB_UPDATE",
    /**
     * A click event from any resource click on side panel - to show relevant state in content scripts.
     */
    CLICK_FROM_SIDEPANEL = "CLICK_FROM_SIDEPANEL",
    /**
     * An event to toggle (open or close) side panel - typically sent from content script.
     */
    TOGGLE_SIDEPANEL = "TOGGLE_SIDEPANEL",
    /**
     * An event to exchange the state of the page - typically sent from side panel and relayed to conent script or published from content script.
     */
    PAGE_STATE = "PAGE_STATE",
    /**
     * @deprecated - use UPLOAD_FILE instead
     */
    UPLOAD_TO_S3_USING_UPLOAD_URL = "UPLOAD_TO_S3_USING_UPLOAD_URL",
    /**
     * An event to delegate flux to the background script.
     */
    FLUX_DELEGATION = "flux",
    LOGIN = "login",
    LOGOUT = "logout",
    UPLOAD_FILE = "upload",
    RUN = "run"
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