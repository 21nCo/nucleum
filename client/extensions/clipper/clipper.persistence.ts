import { ClipperExtensionEvent, type TextHighlightContent, type VideoTimestampContent } from "$lib/client/types/memotron/clip.type";
import { replaceParams } from "$lib/client/utils/surreal.utils";
import { Surreal } from "surrealdb.js";
import type { TabData } from "$lib/client/types/extension.type";
import { interceptSurrealResponse, resolveCurrentTabData, sendMessageToContentScript } from "$lib/client/utils/extension.utils";



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
      const params = {url: tabData.url, data: tabData};
      const result = await this.queryUsingHttp(query, params);
      console.log("save web page", { result });
      if (result && result.id) { 
        chrome.storage.local.set({ node: { id: result.id } });
        if (isFromSidepanel) {
          sendMessageToContentScript({ event: ClipperExtensionEvent.PAGE_SAVING_STATUS, node: result.id });
        } else {
          chrome.runtime.sendMessage({ event: ClipperExtensionEvent.PAGE_SAVING_STATUS, node: result.id });
        }
      }
      return result;
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
        chrome.runtime.sendMessage({ event: ClipperExtensionEvent.PAGE_SAVING_STATUS, node: result.page.id});
      }
      return result;
    } catch (e) {
      console.error("ERROR", e);
    }
  }


  /**
   * Delegated from content scripts. tabData is passed from content script to save the web page if the web page is not saved already.
   * @param content 
   * @param tabData 
   * @returns 
   */
  async saveClip(content: TextHighlightContent | VideoTimestampContent, tabData?: TabData) {
    try {
      let id = "";
      const nodeData = await chrome.storage.local.get("node");
      if (nodeData?.node?.id) {
        id = nodeData.node.id;
      } else {
        id = tabData.url;
      }
      const query = "return fn::memotron::clipper::saveClip($id, $content, $tabData)";
      const params = { id, content, tabData };
      const result = await this.queryUsingHttp(query, params);
      console.log("save clip", { result });
      if (result && result.parent) { 
        chrome.storage.local.set({ node: { id: result.parent } });
        chrome.runtime.sendMessage({ event: ClipperExtensionEvent.PAGE_SAVING_STATUS, node: result.parent });
      }
      return result;
    } catch (e) {
      console.error("ERROR", e);
    }
  }

  async saveToolbarState(toolbarState: any) {
    try {
      const query = "return UPDATE kv:clipperToolbarState SET state = $toolbarState;";
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
        const query = "SELECT timestamp FROM youtubeClips WHERE videoId = $videoId;";
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
    fetch(multimediaSrc).then(response => response.blob()).then(blob => {
        // uploadFileToServer(blob, multimediaSrc, color);
    });
  }

  /**
   * TODO - Complete history logging - only once the user setting is implemented.
   */
  async saveLog(userId, url, currentTime, logSwitch, deviceInfo) {
    const domain = new URL(url).hostname;
    return;
    try {
      if (logSwitch) {
          await this.db.create('History', {
              userId: userId,
              Domain: domain,
              URL: url,
              StartTime: currentTime,
              EndTime: null,
              DeviceInfo: deviceInfo,
          });
      } else {
          // Update the last record with endTime.
          const lastRecord = await this.db.query(
              'SELECT id, StartTime FROM type::table($tb) ORDER BY StartTime DESC LIMIT 1;',
              { tb: 'History' }
          );
          const lastRecordId = lastRecord[0][0].id;
          console.log(lastRecordId);
          await this.db.query(
              'UPDATE History SET EndTime = $currentTime WHERE id = $lastRecordId;', { 
                  currentTime: currentTime,
                  lastRecordId: lastRecordId
              }
          );
          await this.db.create('History', {
              userId: userId,
              Domain: domain,
              URL: url,
              StartTime: currentTime,
              EndTime: null,
              DeviceInfo: deviceInfo,
          });
      }
  } catch (e) {
      console.error('ERROR', e);
  }
  }
}
