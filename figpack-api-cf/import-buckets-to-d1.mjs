import fs from "fs";
import { execSync } from "child_process";

// Read and parse all buckets
const data = fs.readFileSync("buckets.json", "utf8")
  .split("\n")
  .filter(Boolean)
  .map(line => JSON.parse(line));

console.log(`Found ${data.length} buckets to import`);

// Build a batch SQL script
const sqlStatements = data.map((bucket) => {
  // Escape single quotes in text fields
  const name = (bucket.name || "").replace(/'/g, "''");
  const provider = (bucket.provider || "").replace(/'/g, "''");
  const description = (bucket.description || "").replace(/'/g, "''");
  const bucketBaseUrl = (bucket.bucketBaseUrl || "").replace(/'/g, "''");
  
  // Flatten credentials
  const awsAccessKeyId = (bucket.credentials?.AWS_ACCESS_KEY_ID || "").replace(/'/g, "''");
  const awsSecretAccessKey = (bucket.credentials?.AWS_SECRET_ACCESS_KEY || "").replace(/'/g, "''");
  const s3Endpoint = (bucket.credentials?.S3_ENDPOINT || "").replace(/'/g, "''");
  
  // Flatten authorization
  const isPublic = bucket.authorization?.isPublic ? 1 : 0;
  const authorizedUsers = JSON.stringify(bucket.authorization?.authorizedUsers || []).replace(/'/g, "''");
  
  // Convert date strings to timestamps (milliseconds since epoch)
  const createdAt = bucket.createdAt ? (typeof bucket.createdAt === 'number' ? bucket.createdAt : new Date(bucket.createdAt).getTime()) : Date.now();
  const updatedAt = bucket.updatedAt ? (typeof bucket.updatedAt === 'number' ? bucket.updatedAt : new Date(bucket.updatedAt).getTime()) : Date.now();

  return `INSERT INTO buckets (name, provider, description, bucket_base_url, created_at, updated_at, aws_access_key_id, aws_secret_access_key, s3_endpoint, is_public, authorized_users)
VALUES ('${name}', '${provider}', '${description}', '${bucketBaseUrl}', ${createdAt}, ${updatedAt}, '${awsAccessKeyId}', '${awsSecretAccessKey}', '${s3Endpoint}', ${isPublic}, '${authorizedUsers}');`;
});

// Write batch SQL to a temporary file
const batchSql = sqlStatements.join("\n");
fs.writeFileSync("import-buckets-batch.sql", batchSql);

console.log("Executing batch import...");

try {
  // Execute the batch SQL file
  execSync(
    `npx wrangler d1 execute figpack-db --remote --file=import-buckets-batch.sql`,
    { stdio: "inherit" }
  );
  console.log("\n✓ Buckets import completed successfully!");
} catch (error) {
  console.error("\n✗ Buckets import failed:", error.message);
  process.exit(1);
} finally {
  // Clean up temporary file
  if (fs.existsSync("import-buckets-batch.sql")) {
    fs.unlinkSync("import-buckets-batch.sql");
  }
}
