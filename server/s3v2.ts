import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Uses aws-sdk v3 to generate a signed URL for an S3 object
 * @param body
 * @param user
 * @returns
 */
export async function generateSignedUrlV2(body: any, user: any) {
  try {
    console.log({ body, user });
    const region = user?.region ?? "us-east-1";
    const s3Client = new S3Client({ region });
    const bucketName =
      (body.isTemp
        ? process.env.TEMP_BUCKET_PREFIX ?? "tidytemp"
        : process.env.FILE_BUCKET_PREFIX ?? "tidyfiles") + `.${region}`;
    let guid = crypto.randomUUID();
    let documentType = body.contentType.split("/")[0];
    if (!user?.id)
      return { statusCode: 500, body: { error: "User not found" } };
    let filePath =
      user.id + "/" + documentType + "/" + guid + "_" + body.fileName;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filePath,
      ACL: "public-read",
      contentType: body.contentType
    });
    const expirationTime = process.env.URL_EXPIRATION_TIME
      ? +process.env.URL_EXPIRATION_TIME
      : 300;
    const uploadURL = await getSignedUrl(s3Client, command, {
      expiresIn: expirationTime
    });
    return {
      statusCode: 201,
      body: {
        uploadURL: uploadURL,
        key: filePath
      }
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: {
        error: err.message
      }
    };
  }
}
