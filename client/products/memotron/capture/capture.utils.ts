import { NodeType } from "../node/node.type";
import type { IMultiFileCaptureData } from "./capture.type";

export function resolveContentTypeForFile(file: File) {
  let nodeType: NodeType | undefined = undefined;
  if (file.type.includes("image/")) {
    nodeType = NodeType.IMAGE;
  } else if (file.type.includes("video/")) {
    nodeType = NodeType.VIDEO;
  } else if (file.type.includes("audio/")) {
    nodeType = NodeType.AUDIO;
  } else if (file.type.includes("application/pdf")) {
    nodeType = NodeType.PDF;
  } else {
    nodeType = NodeType.FILE;
  }
  return nodeType;
}

export function resolveMultipleFilesData(
  files: File[],
  maxSizeInMb: number
): IMultiFileCaptureData {
  let totalFilesCount = files.length;
  let filesWithType = files.map((file) => {
    return {
      file,
      contentType: resolveContentTypeForFile(file)
    };
  });
  let sizeExceededCount = filesWithType.filter(
    (file) => file.file.size > maxSizeInMb * 1024 * 1024
  ).length;
  return {
    files: filesWithType.filter((file) => file.contentType !== undefined),
    totalCount: totalFilesCount,
    sizeExceededCount
  };
}
