import { FileSizeMeasurement } from "@21n/shared-utils/files/file-size-measurement.enum";

/** Convert file size. */
export function convertFileSize(
  sizeInBytes: number,
  desiredType: FileSizeMeasurement
) {
  switch (desiredType) {
    case FileSizeMeasurement.BITS:
      return sizeInBytes * 8;
    case FileSizeMeasurement.BYTES:
      return sizeInBytes;
    case FileSizeMeasurement.KILOBYTES:
      return Math.round((sizeInBytes / 1000) * 100) / 100;
    case FileSizeMeasurement.MEGABYTES:
      return Math.round((sizeInBytes / 1000000) * 100) / 100;
    case FileSizeMeasurement.GIGABYTES:
      return Math.round((sizeInBytes / 1000000000) * 100) / 100;
    default:
      return sizeInBytes;
  }
}
