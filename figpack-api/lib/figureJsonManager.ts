import { IFigure } from "./db";
import { Bucket, putObject } from "./s3Helpers";
import { Bucket as DBBucket } from "../lib/db";

export const updateFigureJson = async (figure: IFigure) => {
  // Create the JSON content based on figure data
  const jsonContent: any = {
    figureUrl: figure.figureUrl,
    bucket: figure.bucket,
    status: figure.status,
    uploadStarted: figure.uploadStarted,
    uploadUpdated: figure.uploadUpdated,
    uploadCompleted: figure.uploadCompleted,
    expiration: figure.expiration,
    figpackVersion: figure.figpackVersion,
    totalFiles: figure.totalFiles,
    totalSize: figure.totalSize,
    pinned: figure.pinned,
    createdAt: figure.createdAt,
    updatedAt: figure.updatedAt,
    figureManagementUrl: figure.figureManagementUrl || "",
  };

  // Only include owner email and pin info if the figure is pinned
  if (figure.pinned) {
    jsonContent.ownerEmail = figure.ownerEmail;
    jsonContent.pinInfo = figure.pinInfo;
  }

  const bucketName = figure.bucket || "figpack-figures";

  const dbBucket = await DBBucket.findOne({ name: bucketName });
  if (!dbBucket) {
    throw new Error(`Bucket not found: ${bucketName}`);
  }
  const bucketBaseUrl = dbBucket.bucketBaseUrl;

  // Create S3 bucket configuration from database bucket
  const s3Bucket: Bucket = {
    uri: `r2://${dbBucket.name}`,
    credentials: JSON.stringify({
      accessKeyId: dbBucket.credentials.AWS_ACCESS_KEY_ID,
      secretAccessKey: dbBucket.credentials.AWS_SECRET_ACCESS_KEY,
      endpoint: dbBucket.credentials.S3_ENDPOINT,
    }),
  };

  try {
    const prefix = `${bucketBaseUrl}/`;
    if (!figure.figureUrl.startsWith(prefix)) {
      throw new Error(`Figure URL must start with ${prefix}`);
    }
    const figureUrlWithoutIndexHtml = figure.figureUrl.endsWith("/index.html")
      ? figure.figureUrl.slice(0, -"/index.html".length)
      : figure.figureUrl;
    const key =
      figureUrlWithoutIndexHtml.slice(prefix.length) + "/figpack.json";
    // Store the JSON file in the figure's directory
    await putObject(s3Bucket, {
      Bucket: dbBucket.name,
      Key: key,
      Body: JSON.stringify(jsonContent, null, 2),
      ContentType: "application/json",
    });

    return true;
  } catch (error) {
    console.error("Error updating figpack.json:", error);
    throw error;
  }
};
