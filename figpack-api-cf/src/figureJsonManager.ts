import { Env, Figure } from "./types";
import { putObject, S3BucketConfig } from "./s3Utils";

// Helper to convert database row to Figure object
function rowToFigure(row: any): Figure {
  return {
    id: row.id,
    figureUrl: row.figure_url,
    bucket: row.bucket,
    status: row.status,
    ownerEmail: row.owner_email,
    uploadStarted: row.upload_started,
    uploadUpdated: row.upload_updated,
    uploadCompleted: row.upload_completed,
    expiration: row.expiration,
    figpackVersion: row.figpack_version,
    totalFiles: row.total_files,
    totalSize: row.total_size,
    uploadProgress: row.upload_progress,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pinned: row.pinned === 1,
    title: row.title,
    pinName: row.pin_name,
    pinDescription: row.pin_description,
    pinnedTimestamp: row.pinned_timestamp,
    renewalTimestamp: row.renewal_timestamp,
    figureManagementUrl: row.figure_management_url,
    figpackManageUrl: row.figpack_manage_url,
    channel: row.channel,
    isEphemeral: row.is_ephemeral === 1,
    sourceUrl: row.source_url,
  };
}

export async function updateFigureJson(figureUrl: string, env: Env): Promise<void> {
  // Get the figure from the database
  const figureRow = await env.figpack_db
    .prepare("SELECT * FROM figures WHERE figure_url = ?;")
    .bind(figureUrl)
    .first();

  if (!figureRow) {
    throw new Error(`Figure not found: ${figureUrl}`);
  }

  const figure = rowToFigure(figureRow);

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
    figpackManageUrl: figure.figpackManageUrl || "",
  };

  // Only include owner email and pin info if the figure is pinned
  if (figure.pinned) {
    jsonContent.ownerEmail = figure.ownerEmail;
    jsonContent.pinInfo = {
      name: figure.pinName,
      description: figure.pinDescription,
      timestamp: figure.pinnedTimestamp,
    };
  }

  const bucketName = figure.bucket || "figpack-figures";

  // Get bucket configuration from database
  const bucketRow = await env.figpack_db
    .prepare("SELECT * FROM buckets WHERE name = ?;")
    .bind(bucketName)
    .first();

  if (!bucketRow) {
    throw new Error(`Bucket not found: ${bucketName}`);
  }

  const bucketBaseUrl = bucketRow.bucket_base_url as string;
  const provider = bucketRow.provider as string;

  // Construct bucket URI from the bucket name
  let bucketUri: string;
  if (provider === "cloudflare") {
    bucketUri = `r2://${bucketName}`;
  } else {
    bucketUri = `s3://${bucketName}`;
  }

  // Create S3 bucket configuration
  const s3Bucket: S3BucketConfig = {
    uri: bucketUri,
    credentials: JSON.stringify({
      accessKeyId: bucketRow.aws_access_key_id,
      secretAccessKey: bucketRow.aws_secret_access_key,
      endpoint: bucketRow.s3_endpoint,
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

    const key = figureUrlWithoutIndexHtml.slice(prefix.length) + "/figpack.json";

    // Store the JSON file in the figure's directory
    await putObject(
      s3Bucket,
      key,
      JSON.stringify(jsonContent, null, 2),
      "application/json"
    );
  } catch (error) {
    console.error("Error updating figpack.json:", error);
    throw error;
  }
}
