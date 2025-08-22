import { bucketBaseUrl } from "./config";
import { IFigure } from "./db";
import getS3Client from "./getS3Client";
import { Bucket, putObject } from "./s3Helpers";

// Get the bucket configuration
const bucketCredentials = process.env.BUCKET_CREDENTIALS;
if (!bucketCredentials) {
  throw new Error("Missing BUCKET_CREDENTIALS");
}

const bucket: Bucket = {
  uri: "r2://figpack-figures",
  credentials: bucketCredentials,
};

export const updateFigureJson = async (figure: IFigure) => {
  // Create the JSON content based on figure data
  const jsonContent: any = {
    figureUrl: figure.figureUrl,
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
    await putObject(bucket, {
      Bucket: "figpack-figures",
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
