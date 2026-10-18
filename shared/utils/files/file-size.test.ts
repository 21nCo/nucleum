/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileSizeMeasurement } from "@21n/shared-utils/files/file-size-measurement.enum";
import { convertFileSize } from "@21n/shared-utils/files/file-size";

describe("shared/utils/files/file-size", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("converts file sizes", () => {
    const size = 12_345_678;
    expect(convertFileSize(size, FileSizeMeasurement.BITS)).toBe(size * 8);
    expect(convertFileSize(size, FileSizeMeasurement.BYTES)).toBe(size);
    expect(convertFileSize(size, FileSizeMeasurement.KILOBYTES)).toBeCloseTo(
      12345.68
    );
    expect(convertFileSize(size, FileSizeMeasurement.MEGABYTES)).toBeCloseTo(
      12.35
    );
    expect(convertFileSize(size, FileSizeMeasurement.GIGABYTES)).toBeCloseTo(
      0.01
    );
  });
});
