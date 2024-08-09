

//TODO - Temp - use utils.ts after lib refactoring
export function interceptSurrealResponse(response: any, context: string = "") {
  console.log({ context, response });
  if (!response || !(response.length > 0)) return null;
  return checkSurrealResponse(response[0], false);
}
function checkSurrealResponse(
  response: any,
  isShowErrMessage: boolean = false
) {
  if (response.status === "ERR") {
    const pattern = /Database record `.*` already exists/;
    const match = pattern.test(response.result);
    if (match) return "Record already exists";
    else return null;
  } else if (response.status === "OK" && response.result) {
    return response.result;
  } else {
    return response.status === "OK";
  }
}

export async function sendMessageToContentScript(
  message: any,
  tabId?: number
): Promise<any> {
  if (!tabId) {
    const tabData = await chrome.storage.local.get("tab");
    tabId = tabData?.tab?.id;
  }
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

