# Figpack Documents API

This directory contains the API endpoints for managing documents in the figpack system.

## Overview

Documents are markdown content owned by users that can reference one or more figures via iframes. The system tracks which figures are referenced by which documents to prevent deletion or expiration of figures that are in use.

## Database Schema

Documents are stored in MongoDB with the following schema:

```typescript
interface IFigpackDocument {
  documentId: string;        // Unique identifier (e.g., "doc_abc123def456")
  ownerEmail: string;        // Owner's email from API key
  title: string;             // Document title (1-200 chars)
  content: string;           // Markdown content (max 1MB)
  figureRefs: string[];      // Array of figure URLs referenced in content
  createdAt: number;         // Unix timestamp
  updatedAt: number;         // Unix timestamp
}
```

## Key Features

- **Content Storage**: Markdown content is stored directly in MongoDB (not in S3/bucket storage)
- **Public Read Access**: Documents are publicly readable by anyone with the documentId
- **Owner-Only Write**: Only the document owner (or admins) can update or delete documents
- **Automatic Figure Reference Tracking**: The system automatically extracts figure URLs from iframe src attributes
- **No Expiration**: Documents don't expire (unlike figures)

## API Endpoints

### POST `/api/documents/create`

Create a new document.

**Request Body:**
```json
{
  "apiKey": "string (required)",
  "title": "string (required, 1-200 chars)",
  "content": "string (required, max 1MB)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Document created successfully",
  "document": { /* IFigpackDocument */ }
}
```

### PUT `/api/documents/update`

Update an existing document.

**Request Body:**
```json
{
  "apiKey": "string (required)",
  "documentId": "string (required)",
  "title": "string (optional)",
  "content": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Document updated successfully",
  "document": { /* IFigpackDocument */ }
}
```

### GET `/api/documents/get?documentId={id}`

Retrieve a single document by ID (public access).

**Query Parameters:**
- `documentId`: string (required)

**Response:**
```json
{
  "success": true,
  "message": "Document retrieved successfully",
  "document": { /* IFigpackDocument */ }
}
```

### GET `/api/documents/list?apiKey={key}&skip={n}&limit={n}`

List documents owned by the authenticated user.

**Query Parameters:**
- `apiKey`: string (required)
- `skip`: number (optional, default: 0)
- `limit`: number (optional, default: 100, max: 1000)

**Response:**
```json
{
  "success": true,
  "message": "Documents retrieved successfully",
  "documents": [ /* array of IFigpackDocument */ ],
  "total": 42
}
```

### DELETE `/api/documents/delete?documentId={id}&apiKey={key}`

Delete a document (owner or admin only).

**Query Parameters:**
- `documentId`: string (required)
- `apiKey`: string (required)

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

### GET `/api/documents/get-documents-referencing-figure?figureUrl={url}`

Get all documents that reference a specific figure (public access).

**Query Parameters:**
- `figureUrl`: string (required)

**Response:**
```json
{
  "success": true,
  "message": "Found 3 document(s) referencing this figure",
  "documents": [
    {
      "documentId": "doc_abc123",
      "title": "My Analysis",
      "ownerEmail": "user@example.com",
      "createdAt": 1234567890,
      "updatedAt": 1234567890
    }
  ],
  "figureUrl": "https://figures.figpack.org/..."
}
```

## Figure Reference Extraction

The system automatically extracts figure URLs from iframe elements in the markdown content:

```markdown
<iframe src="https://figures.figpack.org/figures/default/abc123/index.html" width="100%" height="600"></iframe>
```

This URL is extracted and stored in the `figureRefs` array. When the content is updated, the `figureRefs` array is automatically updated to reflect any changes.

## Use Cases

1. **Preventing Figure Deletion**: Before deleting a figure, check if it's referenced by any documents
2. **Figure Protection**: Extend figure expiration for figures referenced by documents
3. **Documentation**: Create documentation pages that embed multiple figures
4. **Analysis Reports**: Write markdown reports that include interactive figures
5. **Cross-Referencing**: Find all documents that use a particular figure

## Security

- **Authentication**: Required for create, update, delete, and list operations
- **Authorization**: Users can only modify their own documents (admins can modify any)
- **Public Read**: Documents are publicly readable by documentId
- **Content Limits**: Title max 200 chars, content max 1MB

## Future Enhancements

Potential future features (not yet implemented):
- Document search functionality
- Document versioning
- Collaboration/sharing features
- Rich text editor UI
- Document templates
- Export to PDF/HTML
