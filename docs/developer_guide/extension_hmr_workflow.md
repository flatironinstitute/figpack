# Extension Development Workflow

This guide explains how to set up and use a development workflow for figpack extensions during development.

## Setup

### 1. Extension Configuration

Your extension needs a Vite configuration that supports dev server mode. See the figpack-3d example.

### 2. Package.json Scripts

Add development scripts to your extension's package.json. See figpack-3d example.

## Development Workflow

### Step 1: Start Extension Dev Server

```bash
cd extension_packages/your_extension
npm install  # Install concurrently if not already installed
npm run dev
```

This command:
1. Builds the extension once
2. Starts a file watcher that rebuilds on source changes
3. Starts a preview server on port 5174 serving the built files

Both processes run concurrently, so you get automatic rebuilding AND file serving in one command.

### Step 2: Create a figure that uses the extension and open it in a browser

### Step 3: Add Extension Dev Parameter

Append the extension dev parameter to load from your dev server:

```
?ext_dev=your-extension:http://localhost:5174/your_extension.js
```

So for figpack-3d, it would be:

```
?ext_dev=figpack-3d:http://localhost:5174/figpack_3d.js
```

### Step 5: Develop

- Open the URL in your browser
- Make changes to your extension source code
- Reload the page to see the changes
