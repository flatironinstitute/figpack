# Figpack Documents

A web application for managing and viewing markdown documents that can embed Figpack figures.

## Features

- **User Authentication**: Login with API key
- **Document Management**: Create, edit, delete, and view documents
- **Markdown Support**: Write documents in markdown format
- **Public Viewing**: Anyone can view documents with the document ID
- **Owner Controls**: Only document owners can edit or delete their documents

## Tech Stack

- React 19 with TypeScript
- Material-UI (MUI) for components
- React Router for navigation
- Vite for build tooling

## Development

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Running Locally

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Environment Variables

Set `VITE_FIGPACK_BASE_URL` to point to the Figpack API server. Defaults to `https://figpack-api.vercel.app`.

## API Integration

This application uses the Figpack Documents API endpoints:

- `POST /api/documents/create` - Create new document
- `GET /api/documents/list` - List user's documents
- `GET /api/documents/get` - Get single document (public)
- `PUT /api/documents/update` - Update document
- `DELETE /api/documents/delete` - Delete document

## Usage

1. **Login**: Click the Login button and enter your Figpack API key
2. **Create Document**: Click "New Document" to create a new document
3. **Edit Document**: Click on a document title or the Edit icon to edit
4. **View Document**: Click the View icon to see the public view
5. **Delete Document**: Click the Delete icon to remove a document (with confirmation)

## Routes

- `/` - Documents list page (requires authentication)
- `/document/:documentId` - Edit document page (requires authentication and ownership)
- `/view/:documentId` - View document page (public access)

## Future Enhancements

- Markdown rendering with react-markdown
- Figure embedding preview
- Search and filtering
- Document tagging
- Collaborative editing
