import fs from "fs";
import { execSync } from "child_process";

// Read and parse all documents
const data = fs.readFileSync("documents.json", "utf8")
  .split("\n")
  .filter(Boolean)
  .map(line => JSON.parse(line));

console.log(`Found ${data.length} documents to import`);

// Build a batch SQL script
const sqlStatements = data.map((doc) => {
  // Escape single quotes in text fields
  const documentId = (doc.documentId || "").replace(/'/g, "''");
  const ownerEmail = (doc.ownerEmail || "").replace(/'/g, "''");
  const title = (doc.title || "").replace(/'/g, "''");
  const content = (doc.content || "").replace(/'/g, "''");
  
  // Handle JSON array fields
  const figureRefs = JSON.stringify(doc.figureRefs || []).replace(/'/g, "''");
  
  // Flatten accessControl structure
  const viewMode = (doc.accessControl?.viewMode || "owner-only").replace(/'/g, "''");
  const editMode = (doc.accessControl?.editMode || "owner-only").replace(/'/g, "''");
  const viewerEmails = JSON.stringify(doc.accessControl?.viewerEmails || []).replace(/'/g, "''");
  const editorEmails = JSON.stringify(doc.accessControl?.editorEmails || []).replace(/'/g, "''");
  
  // Convert date strings to timestamps (milliseconds since epoch)
  const createdAt = doc.createdAt ? (typeof doc.createdAt === 'number' ? doc.createdAt : new Date(doc.createdAt).getTime()) : Date.now();
  const updatedAt = doc.updatedAt ? (typeof doc.updatedAt === 'number' ? doc.updatedAt : new Date(doc.updatedAt).getTime()) : Date.now();

  return `INSERT INTO figpack_documents (
    document_id, owner_email, title, content, figure_refs,
    view_mode, edit_mode, viewer_emails, editor_emails, created_at, updated_at
  )
VALUES (
    '${documentId}', '${ownerEmail}', '${title}', '${content}', '${figureRefs}',
    '${viewMode}', '${editMode}', '${viewerEmails}', '${editorEmails}', ${createdAt}, ${updatedAt}
);`;
});

// Write batch SQL to a temporary file
const batchSql = sqlStatements.join("\n");
fs.writeFileSync("import-documents-batch.sql", batchSql);

console.log("Executing batch import...");

try {
  // Execute the batch SQL file
  execSync(
    `npx wrangler d1 execute figpack-db --remote --file=import-documents-batch.sql`,
    { stdio: "inherit" }
  );
  console.log("\n✓ Documents import completed successfully!");
} catch (error) {
  console.error("\n✗ Documents import failed:", error.message);
  process.exit(1);
} finally {
  // Clean up temporary file
  if (fs.existsSync("import-documents-batch.sql")) {
    fs.unlinkSync("import-documents-batch.sql");
  }
}
