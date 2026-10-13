import { isExtensionEnvironment } from "@21n/shared-utils/browser-environment";

/** Computes the existing browser fingerprint used by legacy API context. */
export async function generateFingerprint() {
  try {
    if (typeof navigator === "undefined" || typeof window === "undefined") {
      return "server";
    }

    if (isExtensionEnvironment()) {
      return "extension";
    }
    const legacyWindow = window as Window & {
      openDatabase?: unknown;
    };
    const components = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency,
      (navigator as any).deviceMemory,
      screen.colorDepth,
      screen.pixelDepth,
      screen.width + "x" + screen.height,
      window.devicePixelRatio,
      !!window.sessionStorage,
      !!window.localStorage,
      !!window.indexedDB,
      !!legacyWindow.openDatabase,
      (navigator as any).cpuClass,
      navigator.platform,
      navigator.plugins.length,
      navigator.mimeTypes.length,
      !!(navigator as any).bluetooth
    ];

    if (window.CanvasRenderingContext2D) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("Hello, world!", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("Hello, world!", 4, 17);
        components.push(canvas.toDataURL());
      }
    }

    if (window.AudioContext) {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      const analyser = audioContext.createAnalyser();
      oscillator.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      components.push(dataArray.join(","));
      await audioContext.close();
    }

    const fingerprint = components.join("###");
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return hashHex;
  } catch (e) {
    console.error({ at: "generateFingerprint", error: e });
  }
}
