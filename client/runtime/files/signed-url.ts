/** Extracts the existing storage key format from a file URL. */
export function getBucketNameandKey(url: string) {
  const urlParts = url.split("/");
  const bucketName = urlParts[3];
  const userId = urlParts[4];
  const directory = urlParts[5];
  let fileName = urlParts[6];
  if (fileName.includes("?") || fileName.includes("%")) {
    fileName = urlParts[6].split("?")[0];
  }
  return `${bucketName}/${userId}/${directory}/${fileName}`;
}

/** Checks the expiration fields of an AWS signed URL. */
export function isUrlExpired(signedUrl: string) {
  const params = new URLSearchParams(signedUrl);
  const amzDate = params.get("X-Amz-Date");
  const amzExpires = params.get("X-Amz-Expires");

  if (amzDate && amzExpires) {
    const date = new Date(
      Date.UTC(
        parseInt(amzDate.substring(0, 4)),
        parseInt(amzDate.substring(4, 6)) - 1,
        parseInt(amzDate.substring(6, 8)),
        parseInt(amzDate.substring(9, 11)),
        parseInt(amzDate.substring(11, 13)),
        parseInt(amzDate.substring(13, 15))
      )
    );

    const expiresInSeconds = parseInt(amzExpires, 10);
    const expirationDate = new Date(date.getTime() + expiresInSeconds * 1000);
    const currentDate = new Date();
    return expirationDate < currentDate;
  }
}
