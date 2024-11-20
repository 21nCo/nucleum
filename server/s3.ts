import AWS from "aws-sdk";

export async function generateSignedUrl(body: any, user: any) {
  try {
    console.log({ body, user });
    AWS.config.update({ region: user?.region ?? "us-east-1" });
    // const s3 = new AWS.S3();
    const s3 = new AWS.S3({
      apiVersion: "2006-03-01",
      signatureVersion: "v4"
    });
    const bucketName =
      (process.env.FILE_BUCKET_PREFIX ?? "tidyfiles") +
      `.${user.region ?? "us-east-1"}`;
    let guid = crypto.randomUUID();
    let documentType = body.contentType.split("/")[0];
    if (!user?.id)
      return { statusCode: 500, body: { error: "User not found" } };
    let filePath =
      user.id + "/" + documentType + "/" + guid + "_" + body.fileName;
    const s3Params = {
      Bucket: bucketName,
      Key: filePath,
      Expires: process.env.URL_EXPIRATION_TIME
        ? +process.env.URL_EXPIRATION_TIME
        : 300,
      ContentType: body.contentType,
      ACL: "public-read"
    };
    console.log("Params: ", s3Params);
    const uploadURL = await s3.getSignedUrlPromise("putObject", s3Params);
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
