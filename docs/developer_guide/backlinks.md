# Backlinks System

The backlinks system is a component of figpack that helps track and manage references to figpack figures across public GitHub repositories. This system ensures that figures being actively used in documentation remain accessible.

## Overview

The backlinks system consists of two main components:

1. **figpack-url-refs**: A repository that maintains a daily-updated index of figpack figure URLs used across public GitHub repositories
2. **Bulk Renewal Process**: An administrative function that prevents referenced figures from expiring

## figpack-url-refs Repository

The [figpack-url-refs](https://github.com/magland/figpack-url-refs) repository runs a daily GitHub Actions workflow to:

1. Search public GitHub repositories for Markdown files containing figpack URLs (`https://figures.figpack.org/`)
2. Clone repositories and scan their Markdown files for figpack references
3. Generate a JSON file containing all found references
4. Deploy the results to GitHub Pages

The data is accessible at

`https://magland.github.io/figpack-url-refs/figpack-url-refs.json`

Example JSON structure:

```json
[
  {
    "repo": "owner/name",
    "file": "relative/path/to/file.md",
    "url": "https://figures.figpack.org/..."
  }
]
```

## Bulk Renewal Process

To ensure figures referenced in public repositories remain accessible, the system includes a bulk renewal mechanism:

1. The figpack-manage administrative interface includes a "Renew Bulk" button that:

   - Fetches the latest list of referenced figures from figpack-url-refs
   - For each referenced figure, extends its expiration date to at least 7 days in the future
   - Updates the figure's metadata both in the database and in its `figpack.json` file

2. The renewal process:

   - Skips pinned figures (as they don't expire)
   - Skips ephemeral figures
   - Only updates figures with expiration dates less than 7 days away
   - Maintains a count of renewed figures and any errors encountered

3. This process can be triggered daily by an administrator on the admin page of https://manage.figpack.org to ensure no referenced figures expire
