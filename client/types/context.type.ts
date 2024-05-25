export type Context = {
  isEmbed: boolean;
  isSheet: boolean;
  embed: Embed;
  os: OperatingSystem;
};

/**
 * Embedding context of the app when the app is embedded in a web view or similar native container and published as native app.
 */
export enum Embed {
  NONE = "NONE",
  /**
   * App embedded in web view in iOS or Android
   */
  HANDSET = "HANDSET",
  /**
   * App embedded in web view in iPad or Android tablet
   */
  TABLET = "TABLET",
  /**
   * App embedded in web view in a desktop
   */
  DESKTOP = "DESKTOP",
  TV = "TV",
  WATCH = "WATCH",
  CAR = "CAR"
}

/**
 * Operating system of the device
 */
export enum OperatingSystem {
  IOS = "IOS",
  IPADOS = "IPADOS",
  ANDROID = "ANDROID",
  WINDOWS = "WINDOWS",
  MAC = "MAC",
  LINUX = "LINUX",
  CHROME_OS = "CHROME_OS"
}
