import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Placement } from "@21n/ui/elements/direction.enum";
import { renderPopover } from "@21n/ui/actions/popover-position";

const originalCanvasGetContext = HTMLCanvasElement.prototype.getContext;

const originalCanvasToDataURL = HTMLCanvasElement.prototype.toDataURL;

vi.mock("@21n/shared-utils/obj.utils", () => ({
  deepCopy: (value: any) => value
}));

describe("client/ui/actions/popover-position", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "innerWidth", {
      value: 800,
      configurable: true
    });
    Object.defineProperty(window, "innerHeight", {
      value: 600,
      configurable: true
    });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      configurable: true
    });
    Object.defineProperty(navigator, "language", {
      value: "en-US",
      configurable: true
    });
    Object.defineProperty(navigator, "languages", {
      value: ["en-US"],
      configurable: true
    });
    Object.defineProperty(navigator, "hardwareConcurrency", {
      value: 8,
      configurable: true
    });
    Object.defineProperty(navigator, "deviceMemory", {
      value: 8,
      configurable: true
    });
    Object.defineProperty(navigator, "platform", {
      value: "MacIntel",
      configurable: true
    });
    Object.defineProperty(navigator, "plugins", {
      value: { length: 1 },
      configurable: true
    });
    Object.defineProperty(navigator, "mimeTypes", {
      value: { length: 1 },
      configurable: true
    });
    Object.defineProperty(navigator, "bluetooth", {
      value: {},
      configurable: true
    });
    Object.defineProperty(navigator, "userAgentData", {
      value: {
        getHighEntropyValues: vi.fn(async () => ({
          platform: "macOS",
          model: ""
        }))
      },
      configurable: true
    });
    (globalThis as any).screen = {
      colorDepth: 24,
      pixelDepth: 24,
      width: 1920,
      height: 1080
    };
    (globalThis as any).sessionStorage = {};
    (globalThis as any).localStorage = {};
    (globalThis as any).indexedDB = {};
    (globalThis as any).openDatabase = vi.fn();
  });

  afterEach(() => {
    delete (globalThis as any).chrome;
    delete (globalThis as any).browser;
    delete (globalThis as any).__plasmo;
    if (originalCanvasGetContext) {
      HTMLCanvasElement.prototype.getContext = originalCanvasGetContext;
    } else {
      delete (HTMLCanvasElement.prototype as any).getContext;
    }
    if (originalCanvasToDataURL) {
      HTMLCanvasElement.prototype.toDataURL = originalCanvasToDataURL;
    } else {
      delete (HTMLCanvasElement.prototype as any).toDataURL;
    }
  });

  it("renders popover relative to trigger", () => {
    const trigger = document.createElement("div");
    trigger.getBoundingClientRect = vi.fn(
      () =>
        ({
          top: 10,
          left: 20,
          bottom: 30,
          right: 120,
          width: 100,
          height: 20
        }) as DOMRect
    );
    const popover = document.createElement("div");
    popover.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 80,
          height: 40
        }) as DOMRect
    );
    document.body.appendChild(trigger);
    document.body.appendChild(popover);

    renderPopover({
      triggerRef: trigger,
      popRef: popover,
      placement: Placement.BottomCenter
    } as any);

    expect(popover.style.top).toBe("32px");
    expect(popover.style.left).toBe("20px");
  });
});
