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


