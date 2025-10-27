import { beforeEach, describe, expect, it, vi } from "vitest";

let storeInstance: any;

vi.mock("svelte/store", () => {
  return {
    writable: vi.fn(() => {
      storeInstance = {
        value: false,
        set(newValue: boolean) {
          storeInstance.value = newValue;
        },
        subscribe(fn: (value: boolean) => void) {
          fn(storeInstance.value);
          return () => {};
        }
      };
      return storeInstance;
    }),
    get: vi.fn((store: any) => store.value)
  };
});

describe("client/utils/touchGesture", () => {
  let startTouch: typeof import("./touchGesture").startTouch;
  let moveTouch: typeof import("./touchGesture").moveTouch;
  let swipeIsRefreshing: typeof import("./touchGesture").swipeIsRefreshing;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import("./touchGesture");
    startTouch = module.startTouch;
    moveTouch = module.moveTouch;
    swipeIsRefreshing = module.swipeIsRefreshing;
    storeInstance.set(false);
  });

  it("records initial touch positions", () => {
    const event = {
      currentTarget: {
        id: "list",
        scrollTop: 0,
        parentElement: { scrollTop: 0 }
      },
      touches: [{ clientX: 100, clientY: 200 }]
    } as any;

    startTouch(event);

    expect(storeInstance.value).toBe(false);
  });

  it("invokes swipe left action when threshold met", async () => {
    const baseEvent = {
      currentTarget: {
        id: "list",
        scrollTop: 0,
        parentElement: { scrollTop: 0 }
      },
      touches: [{ clientX: 100, clientY: 100 }]
    } as any;

    startTouch(baseEvent);

    const swipeLeft = vi.fn();
    const moveEvent = {
      touches: [{ clientX: 10, clientY: 110 }],
      preventDefault: vi.fn()
    } as any;

    await moveTouch(moveEvent, null, null, null, swipeLeft, 20);

    expect(swipeLeft).toHaveBeenCalled();
  });

  it("executes swipe down action when at top and not refreshing", async () => {
    const startEvent = {
      currentTarget: {
        id: "list",
        scrollTop: 0,
        parentElement: { scrollTop: 0 }
      },
      touches: [{ clientX: 50, clientY: 50 }]
    } as any;
    startTouch(startEvent);

    const swipeDown = vi.fn();

    const moveEvent = {
      touches: [{ clientX: 55, clientY: 150 }],
      preventDefault: vi.fn()
    } as any;

    await moveTouch(moveEvent, null, null, swipeDown, null, 10);

    expect(swipeDown).toHaveBeenCalled();
    expect(storeInstance.value).toBe(false);
  });
});
