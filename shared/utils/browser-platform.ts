const operatingSystem = {
  UNDETERMINED: "UNDETERMINED",
  IOS: "IOS",
  MACOS: "MACOS",
  ANDROID: "ANDROID",
  WINDOWS: "WINDOWS",
  LINUX: "LINUX"
} as const;

/**
 *
 *
 * This is the value for userAgent - when opening using SafariViewController within an iOS app:
 * UserAgent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) version/17.5 Mobile/15E148 Safari/604.1
 *
 * From MacOS app:
 * UserAgent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) version/14.1.2 Safari/605.1.15
 *
 *
 *
 * Notes on  navigator.userAgentData:
 * Supported in Chromium 90 and above
 * Not supported in Safari as of 2024-06-21
 *
 * @returns
 */
export function detectSystemOS() {
  if (typeof navigator === "undefined") {
    return operatingSystem.UNDETERMINED;
  }

  let os: (typeof operatingSystem)[keyof typeof operatingSystem];
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = userAgent ?? navigator.platform.toLowerCase();
  if (platform.includes("win")) {
    os = operatingSystem.WINDOWS;
  } else if (
    platform.includes("iphone") ||
    platform.includes("ipad") ||
    platform.includes("ios")
  ) {
    os = operatingSystem.IOS;
  } else if (platform.includes("mac")) {
    os = operatingSystem.MACOS;
  } else if (platform.includes("android")) {
    os = operatingSystem.ANDROID;
  } else if (platform.includes("linux")) {
    os = operatingSystem.LINUX;
  } else {
    os = operatingSystem.UNDETERMINED;
  }
  return os;
}

export function detectTouchDevice() {
  if (typeof window !== "undefined")
    return window.matchMedia("(hover: none)").matches;
  return false;
}

export async function getDeviceInfo() {
  try {
    const deviceInfo = {
      make: "",
      model: "",
      platform: ""
    };
    if ("userAgentData" in navigator) {
      try {
        const uaData = await (
          navigator as any
        ).userAgentData.getHighEntropyValues([
          "platform",
          "platformVersion",
          "model",
          "mobile"
        ]);

        deviceInfo.platform = uaData.platform;
        deviceInfo.model = uaData.model;
      } catch (e) {
        console.warn("Unable to get detailed device info from Client Hints");
      }
    }
    if (deviceInfo.model === "") {
      const ua = navigator.userAgent;

      if (ua.match(/iPhone/i)) {
        deviceInfo.make = "Apple";
        deviceInfo.model = "iPhone";
      } else if (ua.match(/iPad/i)) {
        deviceInfo.make = "Apple";
        deviceInfo.model = "iPad";
      } else if (ua.match(/Android/i)) {
        deviceInfo.platform = "Android";
        const match = ua.match(/\((.+?)\)/);
        if (match) {
          const details = match[1].split(";");
          details.forEach((detail) => {
            if (detail.includes("Build/")) {
              const model = detail.split("Build/")[0].trim();
              deviceInfo.model = model;
            }
          });
        }
      } else if (ua.match(/Macintosh/i)) {
        deviceInfo.make = "Apple";
        deviceInfo.model = "Mac";
      } else if (ua.match(/Windows/i)) {
        deviceInfo.platform = "Windows";
      }
    }

    return deviceInfo;
  } catch (e) {
    console.error({ at: "getDeviceInfo", error: e });
  }
}
