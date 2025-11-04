import fs from 'fs';
import { execSync } from 'child_process';

// Read and parse all figures
const data = fs
	.readFileSync('figures.json', 'utf8')
	.split('\n')
	.filter(Boolean)
	.map((line) => JSON.parse(line));

console.log(`Found ${data.length} figures to import`);

// Build a batch SQL script
const sqlStatements = data.map((fig) => {
	// Escape single quotes in text fields
	const figureUrl = (fig.figureUrl || '').replace(/'/g, "''");
	const bucket = fig.bucket ? `'${fig.bucket.replace(/'/g, "''")}'` : 'NULL';
	const status = (fig.status || 'uploading').replace(/'/g, "''");
	const ownerEmail = (fig.ownerEmail || '').replace(/'/g, "''");
	const figpackVersion = (fig.figpackVersion || '').replace(/'/g, "''");
	const title = fig.title ? `'${fig.title.replace(/'/g, "''")}'` : 'NULL';
	const channel = (fig.channel || 'default').replace(/'/g, "''");
	const sourceUrl = fig.sourceUrl ? `'${fig.sourceUrl.replace(/'/g, "''")}'` : 'NULL';

	// Handle numeric fields
	const uploadStarted = fig.uploadStarted || Date.now();
	const uploadUpdated = fig.uploadUpdated || Date.now();
	const uploadCompleted = fig.uploadCompleted || 'NULL';
	const expiration = fig.expiration || Date.now();
	const totalFiles = fig.totalFiles || 'NULL';
	const totalSize = fig.totalSize || 'NULL';
	const createdAt = fig.createdAt ? (typeof fig.createdAt === 'number' ? fig.createdAt : new Date(fig.createdAt).getTime()) : Date.now();
	const updatedAt = fig.updatedAt ? (typeof fig.updatedAt === 'number' ? fig.updatedAt : new Date(fig.updatedAt).getTime()) : Date.now();

	// Handle boolean/integer fields
	const pinned = fig.pinned ? 1 : 0;
	const isEphemeral = fig.isEphemeral ? 1 : 0;

	// Handle optional JSON string field
	const uploadProgress = fig.uploadProgress ? `'${fig.uploadProgress.replace(/'/g, "''")}'` : 'NULL';

	// Flatten pinInfo structure
	const pinName = fig.pinInfo?.name ? `'${fig.pinInfo.name.replace(/'/g, "''")}'` : 'NULL';
	const pinDescription = fig.pinInfo?.figureDescription ? `'${fig.pinInfo.figureDescription.replace(/'/g, "''")}'` : 'NULL';
	const pinnedTimestamp = fig.pinInfo?.pinnedTimestamp || 'NULL';

	// Handle other optional fields
	const renewalTimestamp = fig.renewalTimestamp || 'NULL';
	const figureManagementUrl = fig.figureManagementUrl ? `'${fig.figureManagementUrl.replace(/'/g, "''")}'` : 'NULL';
	const figpackManageUrl = fig.figpackManageUrl ? `'${fig.figpackManageUrl.replace(/'/g, "''")}'` : 'NULL';

	return `INSERT INTO figures (
    figure_url, bucket, status, owner_email, upload_started, upload_updated, upload_completed,
    expiration, figpack_version, total_files, total_size, upload_progress, created_at, updated_at,
    pinned, title, pin_name, pin_description, pinned_timestamp, renewal_timestamp,
    figure_management_url, figpack_manage_url, channel, is_ephemeral, source_url
  )
VALUES (
    '${figureUrl}', ${bucket}, '${status}', '${ownerEmail}', ${uploadStarted}, ${uploadUpdated}, ${uploadCompleted},
    ${expiration}, '${figpackVersion}', ${totalFiles}, ${totalSize}, ${uploadProgress}, ${createdAt}, ${updatedAt},
    ${pinned}, ${title}, ${pinName}, ${pinDescription}, ${pinnedTimestamp}, ${renewalTimestamp},
    ${figureManagementUrl}, ${figpackManageUrl}, '${channel}', ${isEphemeral}, ${sourceUrl}
);`;
});

// Write batch SQL to a temporary file
const batchSql = sqlStatements.join('\n');
fs.writeFileSync('import-figures-batch.sql', batchSql);

console.log('Executing batch import...');

try {
	// Execute the batch SQL file
	execSync(`npx wrangler d1 execute figpack-db --remote --file=import-figures-batch.sql`, { stdio: 'inherit' });
	console.log('\n✓ Figures import completed successfully!');
} catch (error) {
	console.error('\n✗ Figures import failed:', error.message);
	process.exit(1);
} finally {
	// Clean up temporary file
	if (fs.existsSync('import-figures-batch.sql')) {
		fs.unlinkSync('import-figures-batch.sql');
	}
}
