import {
  ClipperExtensionEvent,
  type TextHighlightContent,
  type VideoTimestampContent
} from "$lib/client/products/memotron/common/clip.type";
import { replaceParams } from "$lib/client/utils/surreal.utils";
import { Surreal } from "surrealdb.js";
import type { TabData } from "$lib/client/types/extension.type";
import {
  interceptSurrealResponse,
  resolveCurrentTabData,
  sendMessageToContentScript
} from "$lib/client/utils/extension.utils";
import {
  kindleSyncState,
  type Book,
  type BookNode,
  type HighlightNode
} from "./contentScripts/KindleHighlights.types";

/**
 * TODO- Delegate all calls to tidy lib SurrealDatabase once token handshake is complete.
 */
export class ClipperPersistence {
  url: string;
  apiUrl: string;
  namespace: string = "user";
  db = new Surreal();
  token: string | null;
  constructor() {
    this.url = process.env.PLASMO_PUBLIC_DB_URL;
    this.apiUrl = process.env.PLASMO_PUBLIC_API_URL;
    this.connect();
  }

  getToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get("stoken", function (data) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          // console.log("Token retrieved is: " + data.stoken);
          resolve(data.stoken);
        }
      });
    });
  };

  connect() {
    // this.db.connect(this.url, {
    //   namespace: this.namespace,
    //   database: this.database,
    //   auth: {
    //     namespace: this.namespace,
    //     database: this.database,
    //     username: this.username,
    //     password: this.password,
    //   },
    // });
    // chrome.storage.sync.get("token", function (data) {
    //   console.log("Token retrieved is: " + data.token);
    //   this.db.authenticate(data.token);
    //   this.token = data.token;
    // });
  }

  async refreshToken() {
    this.token = await this.getToken();
    // this.db.authenticate(this.token);
  }

  /**
   * Temporary
   * TODO - Use tidy library Surreal helper and Surreal database
   * @param query
   * @param params
   * @returns
   */
  async queryUsingHttp(query: string, params: any) {
    await this.refreshToken();
    query = replaceParams(query, params);
    const response = await fetch(this.apiUrl + "/account/n/run", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Accept: "application/json",
        Authorization: "Bearer " + this.token
      },
      body: JSON.stringify({
        query
      })
    });
    if (response?.ok) {
      let result = await response.json();
      return interceptSurrealResponse(result);
    } else return null;
  }

  /**
   * Can be triggered from either content script or side bar.
   * If triggered from content script, tab data will be present in the message.
   *
   * TODO - save web page node via NodeStore - to update nodes local cache
   *
   * @returns
   */
  async saveWebpage(tabData?: TabData) {
    try {
      const query = "fn::memotron::clipper::saveWebpage($url, $data)";
      let isFromSidepanel = false;
      if (!tabData) {
        isFromSidepanel = true;
        tabData = await resolveCurrentTabData(true);
      }
      const params = { url: tabData.url, data: tabData };
      const result = await this.queryUsingHttp(query, params);
      console.log("save web page", { result });
      if (result?.id) {
        chrome.storage.local.set({ node: { id: result.id } });
        if (isFromSidepanel) {
          sendMessageToContentScript({
            event: ClipperExtensionEvent.PAGE_SAVING_STATUS,
            node: result.id
          });
        } else {
          chrome.runtime.sendMessage({
            event: ClipperExtensionEvent.PAGE_SAVING_STATUS,
            node: result.id
          });
        }
      }
      return result;
    } catch (e) {
      console.error("ERROR", e);
    }
  }

  link(from: string, to: string) {
    try {
      const query = "return fn::memotron::link($from, $to)";
      return this.queryUsingHttp(query, { from, to });
    } catch (e) {
      console.error("ERROR", e);
    }
  }
  unlink(from: string, to: string) {
    try {
      const query = "return fn::memotron::unlink($from, $to)";
      return this.queryUsingHttp(query, { from, to });
    } catch (e) {
      console.error("ERROR", e);
    }
  }

  async fetchPage(url?: string) {
    try {
      if (!url) {
        const currentTabData = await resolveCurrentTabData();
        url = currentTabData.url;
      }
      const query = "return fn::memotron::clipper::fetchPage($url)";
      const result = await this.queryUsingHttp(query, { url });
      console.log("fetch page ", { result });
      if (result && result.page) {
        chrome.storage.local.set({ node: { id: result.page.id } });
        chrome.runtime.sendMessage({
          event: ClipperExtensionEvent.PAGE_SAVING_STATUS,
          node: result.page.id
        });
      }
      return result;
    } catch (e) {
      console.error("ERROR", e);
    }
  }

  /**
   * Delegated from content scripts. tabData is passed from content script to save the web page if the web page is not saved already.
   *
   * TODO - save clip via NodeStore - to update nodes local cache
   *
   * @param content
   * @param tabData
   * @returns
   */
  async saveClip(
    content: TextHighlightContent | VideoTimestampContent,
    tabData?: TabData
  ) {
    try {
      let id = "";
      const nodeData = await chrome.storage.local.get("node");
      if (nodeData?.node?.id) {
        id = nodeData.node.id;
      } else {
        id = tabData.url;
      }
      const query =
        "return fn::memotron::clipper::saveClip($id, $content, $tabData)";
      const params = { id, content, tabData };
      const result = await this.queryUsingHttp(query, params);
      console.log("save clip", { result });
      if (result?.parent) {
        chrome.storage.local.set({ node: { id: result.parent } });
        chrome.runtime.sendMessage({
          event: ClipperExtensionEvent.PAGE_SAVING_STATUS,
          node: result.parent
        });
      }
      return result;
    } catch (e) {
      console.error("ERROR", e);
    }
  }

  /**
  @deprecated - use toolbarState store instead
  */
  async saveToolbarState(toolbarState: any) {
    try {
      const query =
        "return UPDATE kv:clipperToolbarState SET state = $toolbarState;";
      const result = await this.queryUsingHttp(query, { toolbarState });
      console.log("save toolbar state", { result });
      return result;
    } catch (e) {
      console.error("ERROR", e);
    }
  }

  updateClip() {
    // TODO
  }

  /**
   * @deprecated - use {@link fetchPage} instead
   */
  async fetchYoutubeClips(videoId) {
    try {
      const query =
        "SELECT timestamp FROM youtubeClips WHERE videoId = $videoId;";
      const params = { videoId: videoId };
      const result = await this.db.query(query, params);
      if (result[0].length > 0) {
        return result[0];
      } else {
        console.log("No records found with the specified URL.");
        return null;
      }
    } catch (error) {
      console.error("Error fetching records:", error);
      throw error;
    }
  }
  /**
   * @deprecated - use saveClip instead
   * @param url
   * @param videoId
   * @param timestamp
   */
  async saveYoutubeClip(url, videoId, timestamp) {
    try {
      await this.db.create("youtubeClips", {
        videoId: videoId,
        timestamp: timestamp,
        savedClips: url
      });
    } catch (e) {
      console.error("ERROR", e);
    }
  }

  saveMultimedia(element, color) {
    const multimediaSrc = element.src;
    fetch(multimediaSrc)
      .then((response) => response.blob())
      .then((blob) => {
        // uploadFileToServer(blob, multimediaSrc, color);
      });
  }
  async saveAllBooks(books: BookNode[]) {
    try {
      const query = "INSERT INTO node $books";
      const params = { books };
      const response = await this.queryUsingHttp(query, params);
      return response;
    } catch (e) {
      console.error("Error saving books:", e);
    }
  }

  async deleteAllBooksAndHiglights() {
    try {
      const query = `DELETE node WHERE contentType='KINDLE_NOTES&HIGHLIGHTS_BOOK' OR contentType='KINDLE_NOTE&HIGHLIGHT'`;
      const params = {};
      const response = await this.queryUsingHttp(query, params);
      await this.updateKindleSyncState(kindleSyncState.Sync);
      return interceptSurrealResponse(response);
    } catch (e) {
      console.error("Error saving books:", e);
    }
  }
  async saveHighlightsAndNotes(nodes: HighlightNode[]) {
    try {
      const query = `INSERT INTO node $nodes`;
      const params = { nodes };
      const response = await this.queryUsingHttp(query, params);
      return interceptSurrealResponse(response);
    } catch (e) {
      console.error("Error saving books:", e);
    }
  }

  async updateKindleSyncState(state: any) {
    try {
      const query =
        "UPDATE kv:clipperToolbarState SET kindleSyncState=$state ;";
      const result = await this.queryUsingHttp(query, { state });
      return result[0].kindleSyncState;
    } catch (e) {
      console.error("ERROR", e);
    }
  }
  async getKindleSyncState() {
    try {
      const query = "SELECT kindleSyncState FROM kv:clipperToolbarState;";
      const result = await this.queryUsingHttp(query, {});
      return result[0].kindleSyncState;
    } catch (e) {
      console.error("ERROR", e);
    }
  }
  /**
   * TODO - Complete history logging - only once the user setting is implemented.
   */
  async saveLog(userId, url, currentTime, logSwitch, deviceInfo) {
    return;
    const domain = new URL(url).hostname;
    try {
      if (logSwitch) {
        await this.db.create("History", {
          userId: userId,
          Domain: domain,
          URL: url,
          StartTime: currentTime,
          EndTime: null,
          DeviceInfo: deviceInfo
        });
      } else {
        // Update the last record with endTime.
        const lastRecord = await this.db.query(
          "SELECT id, StartTime FROM type::table($tb) ORDER BY StartTime DESC LIMIT 1;",
          { tb: "History" }
        );
        const lastRecordId = lastRecord[0][0].id;
        console.log(lastRecordId);
        await this.db.query(
          "UPDATE History SET EndTime = $currentTime WHERE id = $lastRecordId;",
          {
            currentTime: currentTime,
            lastRecordId: lastRecordId
          }
        );
        await this.db.create("History", {
          userId: userId,
          Domain: domain,
          URL: url,
          StartTime: currentTime,
          EndTime: null,
          DeviceInfo: deviceInfo
        });
      }
    } catch (e) {
      console.error("ERROR", e);
    }
  }
}
