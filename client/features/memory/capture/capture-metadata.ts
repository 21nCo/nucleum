import { fileUpload } from "@nucleum/shared-state/files/file-upload";
import {
  type IAudioMetadata,
  type IImageMetadata
} from "@nucleum/features/memory/node/node.type";
import { logger } from "@nucleum/client/runtime/logging/logger";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import { getImageColorsFromFile } from "@21n/ui/actions/image-colors";
import { parseBuffer } from "music-metadata";
import ExifReader from "exifreader";
import { resolveBlobPart } from "@nucleum/features/memory/capture/clipboard-content";

/** Extracts media metadata and stores embedded artwork. */
export async function parseMetadata(file: File) {
  try {
    if (file.type.startsWith("image/")) {
      let metadata: IImageMetadata = {};
      const colors = await getImageColorsFromFile(file, 10);
      const tags = await ExifReader.load(file);
      const importantMetadata = extractImportantMetadata(tags);
      metadata = {
        colors,
        ...importantMetadata
      };
      return metadata;
    }
    if (file.type.startsWith("audio/")) {
      let metadata: IAudioMetadata = {};

      let parsedMetadata = await parseBuffer(
        new Uint8Array(await file.arrayBuffer())
      );
      if (parsedMetadata?.common) {
        let imageId: IRecordId | undefined = undefined;
        if (parsedMetadata.common.picture?.[0]?.data) {
          try {
            const imageData = parsedMetadata.common.picture[0].data;
            const imageFile = new File(
              [resolveBlobPart(imageData)],
              file.name,
              {
                type: "image/jpeg"
              }
            );
            const imageUploadResponse = await fileUpload.uploadFileV2(
              "image/jpeg",
              file.name,
              imageFile,
              {
                isGenerateThumbnail: true
              }
            );
            if (imageUploadResponse) {
              imageId = imageUploadResponse[0].id;
            }
          } catch (e) {
            logger.error({
              at: "CaptureStore.parseMetadata.picture",
              error: e
            });
          }
        }
        metadata = {
          ...parsedMetadata.common,
          ...parsedMetadata.format,
          picture: imageId
        };
      }
      return metadata;
    }
  } catch (e: any) {
    logger.error({ at: "CaptureStore.parseMetadata", error: e });
    return;
  }

  function extractImportantMetadata(tags: any): IImageMetadata {
    return {
      deviceInfo: {
        make: tags.Make?.description,
        model: tags.Model?.description,
        software: tags.Software?.description
      },
      imageDetails: {
        width: tags["Image Width"]?.value || tags.PixelXDimension?.value || 0,
        height: tags["Image Height"]?.value || tags.PixelYDimension?.value || 0,
        orientation: tags.Orientation?.description,
        dateTime: tags.DateTime?.description
      },
      cameraSettings: {
        aperture: tags.FNumber?.description,
        exposureTime: tags.ExposureTime?.description,
        iso: tags.ISOSpeedRatings?.value,
        focalLength: tags.FocalLength?.description,
        flash: tags.Flash?.description
      },
      location: tags.GPSLatitude
        ? {
            latitude: tags.GPSLatitude.description,
            longitude: tags.GPSLongitude?.description,
            altitude: tags.GPSAltitude?.description
          }
        : undefined
    };
  }
}
