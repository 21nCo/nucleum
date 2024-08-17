import { NodeType } from "$lib/client/products/memotron/node/node.type"

/**
 * Web URLs that only support screen shots. Options like save page, summarize will be disabled for these pages.
 */
export const screenShotOnlyPages = [
    /^https:\/\/app\.[^\/]+\/.*/,
    /^https:\/\/(?:www\.)?figma\.com\/(?:design|files)\/.+/,
    /^https:\/\/(?:twitter\.com|x\.com)\/(?:(i|jobs|explore|home|settings|messages|notifications|search|hashtag|compose)(?:\/(.+))?|([^\/]+)\/lists)?\/?$/
]


export const contentTypeMap = [
    {
        contentType: NodeType.TWEET,
        regex: [
            /^https:\/\/(?:www\.)?(twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/(\d+)\/?$/
        ],
        currentDomain: "x.com"
    }, {
        contentType: NodeType.TWITTER_PROFILE,
        regex: [
            /^https:\/\/(?:www\.)?(twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/?$/
        ]
    }
]

/**
 * @deprecated - use commonMetadata instead
 */
export const minimalMetadataPages = [
    "wikipedia.org",
    "youtube.com",
    "facebook.com",
    "instagram.com",
    "twitter.com",
    "reddit.com",
    "pinterest.com",
    "tiktok.com",
    "linkedin.com",
    "medium.com",
    "github.com",
    "stackoverflow.com",
    "google.com",
    "amazon.com",
    "apple.com",
    "microsoft.com",
    "ebay.com",
    "tumblr.com",
    "wordpress.com",
    "discord.com",
    "twitch.tv",
    "patreon.com",
    "soundcloud.com",
]

export const commonMetadata = [
    {
        domain: "twitter.com",
        faviconUrl: "https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png",
        ogImage: "https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png"
    },
    {
        domain: "wikipedia.org",
        faviconUrl: "https://en.wikipedia.org/static/apple-touch/wikipedia.png",
    },
    {
        domain: "youtube.com",
    },
    {
        domain: "stackoverflow.com",
    },
    {
        domain: "google.com"
    },
    {
        domain: "medium.com"
    }
]