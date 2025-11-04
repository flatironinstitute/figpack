import fs from 'fs';
import { execSync } from 'child_process';

console.log('================================================');
console.log('Data Migration Verification');
console.log('================================================\n');

// Helper function to execute D1 query and parse result
function queryD1(sql) {
	try {
		const result = execSync(`npx wrangler d1 execute figpack-db --remote --command="${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8' });
		return result;
	} catch (error) {
		console.error('Query failed:', error.message);
		return null;
	}
}

// Helper function to count records in MongoDB export
function countMongoRecords(filename) {
	if (!fs.existsSync(filename)) {
		return 0;
	}
	const data = fs.readFileSync(filename, 'utf8').split('\n').filter(Boolean);
	return data.length;
}

console.log('Checking record counts...\n');

// Users
const mongoUsers = countMongoRecords('users.json');
console.log(`Users (MongoDB export): ${mongoUsers}`);
const d1UsersResult = queryD1('SELECT COUNT(*) as count FROM users');
console.log(`Users (D1 database): ${d1UsersResult ? 'Query executed' : 'Query failed'}`);
console.log('');

// Buckets
const mongoBuckets = countMongoRecords('buckets.json');
console.log(`Buckets (MongoDB export): ${mongoBuckets}`);
const d1BucketsResult = queryD1('SELECT COUNT(*) as count FROM buckets');
console.log(`Buckets (D1 database): ${d1BucketsResult ? 'Query executed' : 'Query failed'}`);
console.log('');

// Figures
const mongoFigures = countMongoRecords('figures.json');
console.log(`Figures (MongoDB export): ${mongoFigures}`);
const d1FiguresResult = queryD1('SELECT COUNT(*) as count FROM figures');
console.log(`Figures (D1 database): ${d1FiguresResult ? 'Query executed' : 'Query failed'}`);
console.log('');

// Documents
const mongoDocuments = countMongoRecords('documents.json');
console.log(`Documents (MongoDB export): ${mongoDocuments}`);
const d1DocumentsResult = queryD1('SELECT COUNT(*) as count FROM figpack_documents');
console.log(`Documents (D1 database): ${d1DocumentsResult ? 'Query executed' : 'Query failed'}`);
console.log('');

console.log('================================================');
console.log('Sample Data Checks');
console.log('================================================\n');

// Check a sample user
console.log('Sample user check:');
queryD1('SELECT email, name, is_admin FROM users LIMIT 1');
console.log('');

// Check a sample bucket
console.log('Sample bucket check:');
queryD1('SELECT name, provider, is_public FROM buckets LIMIT 1');
console.log('');

// Check a sample figure
console.log('Sample figure check:');
queryD1('SELECT figure_url, status, owner_email, pinned FROM figures LIMIT 1');
console.log('');

// Check a sample document
console.log('Sample document check:');
queryD1('SELECT document_id, owner_email, title, view_mode FROM figpack_documents LIMIT 1');
console.log('');

console.log('================================================');
console.log('Verification Complete');
console.log('================================================\n');

console.log('Summary of MongoDB exports:');
console.log(`  Users: ${mongoUsers}`);
console.log(`  Buckets: ${mongoBuckets}`);
console.log(`  Figures: ${mongoFigures}`);
console.log(`  Documents: ${mongoDocuments}`);
console.log(`  Total: ${mongoUsers + mongoBuckets + mongoFigures + mongoDocuments} records`);
console.log('');

console.log('To verify D1 counts match, check the query results above.');
console.log('You can also manually query D1 with:');
console.log('  npx wrangler d1 execute figpack-db --remote --command="SELECT COUNT(*) FROM users"');
console.log('');
