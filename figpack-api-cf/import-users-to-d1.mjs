import fs from 'fs';
import { execSync } from 'child_process';

// Read and parse all users
const data = fs
	.readFileSync('users.json', 'utf8')
	.split('\n')
	.filter(Boolean)
	.map((line) => JSON.parse(line));

console.log(`Found ${data.length} users to import`);

// Build a batch SQL script
const sqlStatements = data.map((u) => {
	const email = (u.email || '').replace(/'/g, "''");
	const name = (u.name || '').replace(/'/g, "''");
	const research = (u.researchDescription || '').replace(/'/g, "''");
	const apiKey = (u.apiKey || '').replace(/'/g, "''");
	const isAdmin = u.isAdmin ? 1 : 0;
	// Convert date strings to timestamps (milliseconds since epoch)
	const createdAt = u.createdAt ? new Date(u.createdAt).getTime() : Date.now();
	const updatedAt = u.updatedAt ? new Date(u.updatedAt).getTime() : Date.now();

	return `INSERT INTO users (email, name, research_description, api_key, is_admin, created_at, updated_at)
VALUES ('${email}', '${name}', '${research}', '${apiKey}', ${isAdmin}, ${createdAt}, ${updatedAt});`;
});

// Write batch SQL to a temporary file
const batchSql = sqlStatements.join('\n');
fs.writeFileSync('import-batch.sql', batchSql);

console.log('Executing batch import...');

try {
	// Execute the batch SQL file
	execSync(`npx wrangler d1 execute figpack-db --remote --file=import-batch.sql`, { stdio: 'inherit' });
	console.log('\n✓ Import completed successfully!');
} catch (error) {
	console.error('\n✗ Import failed:', error.message);
	process.exit(1);
} finally {
	// Clean up temporary file
	if (fs.existsSync('import-batch.sql')) {
		fs.unlinkSync('import-batch.sql');
	}
}
