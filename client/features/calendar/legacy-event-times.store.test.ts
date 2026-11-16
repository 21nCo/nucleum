import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { get } from "svelte/store";
import {
  datafn,
  destroyNucleumDatafn,
  initializeNucleumDatafn
} from "@nucleum/datafn/datafn.store";
import { Product } from "@nucleum/client/config/product.type";
import { UserDataMode } from "@nucleum/client/runtime/account/account.type";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { repairLegacyEventTimesIfDue } from "./legacy-event-times";
import { resolveCalendarEventOverlapFilters } from "./calendar.utils";

describe("repairLegacyEventTimesIfDue", () => {
  afterEach(async () => {
    await destroyNucleumDatafn();
  });

  it("lifts legacy times so overlap queries find the event, once a day", async () => {
    appStore.set({ ...get(appStore), product: Product.MEMOTRON });
    await initializeNucleumDatafn({
      product: Product.MEMOTRON,
      account: {
        dataMode: UserDataMode.LOCAL,
        userId: "legacy-event-times-test"
      },
      dapId: "legacy-event-times-dap",
      env: `test-${crypto.randomUUID()}`
    });
    await datafn.event.mutate([
      {
        operation: "insert",
        id: "event:legacy",
        record: {
          id: "event:legacy",
          label: "Legacy",
          value: { startUnix: 1_000, endUnix: 2_000 }
        }
      },
      {
        operation: "insert",
        id: "event:current",
        record: { id: "event:current", label: "Current", startUnix: 1_500 }
      }
    ] as any);

    const range = { start: 500, end: 3_000 };
    const findIds = async () => {
      const results = await Promise.all(
        resolveCalendarEventOverlapFilters(range).map((filters) =>
          datafn.event.query({ select: ["id"], filters })
        )
      );
      return results.flatMap((result) =>
        (result.data ?? []).map((record: any) => record.id)
      );
    };
    expect(await findIds()).not.toContain("event:legacy");

    const now = Date.now();
    expect(await repairLegacyEventTimesIfDue(now)).toBe(1);
    expect(await findIds()).toContain("event:legacy");
    expect(await repairLegacyEventTimesIfDue(now + 60_000)).toBe(0);
  });
});
