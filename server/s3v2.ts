import { resolveProviderRegionCode } from "$lib/deployment/deploy.utils";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Uses aws-sdk v3 to generate a signed URL for an S3 object
 * @param body
 * @param user
 * @returns
 */
async function resolveSignedUrlForPut(body: any, user: any) {
  try {
    let region = "us-east-1";
    if (user?.region) {
      region = resolveProviderRegionCode(user.region, "aws");
      console.log("resolved region:", { region });
    }
    const s3Client = new S3Client({ region });
    const bucketName =
      (body.isTemp
        ? (process.env.TEMP_BUCKET_PREFIX ?? "tidytemp")
        : (process.env.FILE_BUCKET_PREFIX ?? "tidyfiles")) + `.${region}`;
    let guid = crypto.randomUUID();
    let documentType = body.contentType.split("/")[0];
    if (!user?.id)
      return { statusCode: 500, body: { error: "User not found" } };
    let filePath =
      user.id + "/" + documentType + "/" + guid + "_" + body.fileName;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filePath,
      ContentType: body.contentType
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

export function generateSignedUrlV2(body: any, user: any) {
  if (body?.method === "GET") return resolveSignedUrlForGet(body, user);
  if (body?.method === "PUT") return resolveSignedUrlForPut(body, user);
}

/**
 *
 * @param body
 * @param user
 * @returns
 */
async function resolveSignedUrlForGet(body: any, user: any) {
  try {
    if (!body?.key)
      return { statusCode: 400, body: { error: "Key is required" } };
    let region = "us-east-1";
    if (user?.region) {
      region = resolveProviderRegionCode(user.region, "aws");
      console.log("resolved region:", { region });
    }
    const s3Client = new S3Client({ region });
    if (!user?.id)
      return { statusCode: 500, body: { error: "User not found" } };
    const userIdOnKey = body.key.split("/")[1];
    if (userIdOnKey !== user.id)
      return { statusCode: 403, body: { error: "Forbidden" } };
    const bucketName = body.key.split("/")[0];
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: body.key.split("/").slice(1).join("/")
    });
    const expirationTime = process.env.URL_EXPIRATION_TIME_GET
      ? +process.env.URL_EXPIRATION_TIME_GET
      : 300;
    const getUrl = await getSignedUrl(s3Client, command, {
      expiresIn: expirationTime
    });
    return {
      statusCode: 200,
      body: {
        getUrl,
        key: body.key
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
