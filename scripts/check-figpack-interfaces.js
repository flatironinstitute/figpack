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

function getFileHash(filepath) {
    const content = fs.readFileSync(filepath, 'utf8');
    return {
        content,
        hash: crypto.createHash('sha256').update(content).digest('hex')
    };
}

function main() {
    const files = findFiles('.', 'figpack-interface.ts');
    
    if (files.length === 0) {
        console.log('No figpack-interface.ts files found');
        process.exit(0);
    }

    console.log('Found figpack-interface.ts files:');
    files.forEach(f => console.log(`- ${f}`));

    const firstFile = files[0];
    const firstFileData = getFileHash(firstFile);
    let allMatch = true;
    const differentFiles = [];

    for (let i = 1; i < files.length; i++) {
        const currentFileData = getFileHash(files[i]);
        if (currentFileData.hash !== firstFileData.hash) {
            allMatch = false;
            differentFiles.push(files[i]);
        }
    }

    if (!allMatch) {
        console.error('\nError: Not all figpack-interface.ts files are identical!');
        console.error('The following files differ from', firstFile + ':');
        differentFiles.forEach(f => console.error(`- ${f}`));
        process.exit(1);
    }

    console.log('\nAll figpack-interface.ts files are identical');
}

main();
