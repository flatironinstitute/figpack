#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function findFiles(startPath, filter) {
    if (!fs.existsSync(startPath)) {
        console.error(`Directory ${startPath} does not exist`);
        process.exit(1);
    }

    const results = [];

    function recursiveSearch(currentPath) {
        const files = fs.readdirSync(currentPath);
        
        for (const file of files) {
            const filepath = path.join(currentPath, file);
            const stat = fs.statSync(filepath);
            
            if (stat.isDirectory() && !file.includes('node_modules') && file !== '.git') {
                recursiveSearch(filepath);
            } else if (file === filter) {
                results.push(filepath);
            }
        }
    }

    recursiveSearch(startPath);
    return results;
}

function getFileData(filepath) {
    const content = fs.readFileSync(filepath, 'utf8');
    const stat = fs.statSync(filepath);
    return {
        filepath,
        content,
        hash: crypto.createHash('sha256').update(content).digest('hex'),
        mtime: stat.mtime
    };
}

function findMostRecentFile(files) {
    let mostRecent = files[0];
    for (let i = 1; i < files.length; i++) {
        if (files[i].mtime > mostRecent.mtime) {
            mostRecent = files[i];
        }
    }
    return mostRecent;
}

function propagateChanges(sourceFile, targetFiles) {
    let propagatedCount = 0;
    
    for (const targetFile of targetFiles) {
        if (targetFile.filepath !== sourceFile.filepath) {
            try {
                fs.writeFileSync(targetFile.filepath, sourceFile.content, 'utf8');
                console.log(`✓ Propagated changes to: ${targetFile.filepath}`);
                propagatedCount++;
            } catch (error) {
                console.error(`✗ Failed to propagate to ${targetFile.filepath}: ${error.message}`);
            }
        }
    }
    
    return propagatedCount;
}

function showHelp() {
    console.log(`
figpack-interface.ts Checker and Propagator

USAGE:
  node scripts/check-figpack-interfaces.js [OPTIONS]

OPTIONS:
  --propagate    Propagate changes from the most recently modified file to others
  --help, -h     Show this help message

DESCRIPTION:
  This script finds all figpack-interface.ts files in the project and checks if they
  are identical. If they differ, it can propagate changes from the most recently
  modified file to all others, but only if all the other files are identical to
  each other (to avoid overwriting conflicting changes).

EXAMPLES:
  # Check if all files are identical
  node scripts/check-figpack-interfaces.js

  # Propagate changes from most recent file to others
  node scripts/check-figpack-interfaces.js --propagate
`);
}

function main() {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        showHelp();
        process.exit(0);
    }

    const propagate = process.argv.includes('--propagate');
    
    const filePaths = findFiles('.', 'figpack-interface.ts');
    
    if (filePaths.length === 0) {
        console.log('No figpack-interface.ts files found');
        process.exit(0);
    }

    if (filePaths.length === 1) {
        console.log('Only one figpack-interface.ts file found:');
        console.log(`- ${filePaths[0]}`);
        console.log('\nNothing to check or propagate');
        process.exit(0);
    }

    console.log('Found figpack-interface.ts files:');
    filePaths.forEach(f => console.log(`- ${f}`));

    // Get file data including modification times
    const files = filePaths.map(getFileData);
    
    // Find the most recently modified file
    const mostRecentFile = findMostRecentFile(files);
    console.log(`\nMost recently modified: ${mostRecentFile.filepath} (${mostRecentFile.mtime.toISOString()})`);

    // Check if all OTHER files are identical to each other
    const otherFiles = files.filter(f => f.filepath !== mostRecentFile.filepath);
    
    if (otherFiles.length === 0) {
        console.log('\nOnly one file found, nothing to propagate');
        process.exit(0);
    }

    // Check if all other files are identical to each other
    const firstOtherFile = otherFiles[0];
    let allOthersMatch = true;
    const differentOtherFiles = [];

    for (let i = 1; i < otherFiles.length; i++) {
        if (otherFiles[i].hash !== firstOtherFile.hash) {
            allOthersMatch = false;
            differentOtherFiles.push(otherFiles[i].filepath);
        }
    }

    if (!allOthersMatch) {
        console.error('\nError: The other figpack-interface.ts files (excluding the most recent) are not identical!');
        console.error('Cannot safely propagate changes. The following files differ:');
        differentOtherFiles.forEach(f => console.error(`- ${f}`));
        console.error('\nPlease manually resolve the differences first.');
        process.exit(1);
    }

    // Check if the most recent file is different from the others
    const mostRecentDifferent = mostRecentFile.hash !== firstOtherFile.hash;

    if (!mostRecentDifferent) {
        console.log('\nAll figpack-interface.ts files are already identical');
        process.exit(0);
    }

    console.log('\nThe most recently modified file differs from the others.');
    
    if (propagate) {
        console.log('Propagating changes from most recent file to others...');
        const propagatedCount = propagateChanges(mostRecentFile, files);
        console.log(`\nSuccessfully propagated changes to ${propagatedCount} file(s)`);
    } else {
        console.log('\nTo propagate the most recent changes to other files, run:');
        console.log('node scripts/check-figpack-interfaces.js --propagate');
        console.log('\nFiles that would be updated:');
        otherFiles.forEach(f => console.log(`- ${f.filepath}`));
    }
}

main();
