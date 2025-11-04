# Management Interface

This document covers the implementation of figpack's management interface component.

## Overview

The management interface is a React-based web application that provides a user interface for managing figpack figures. The default instance runs at [manage.figpack.org](https://manage.figpack.org) and is typically accessed through the "Manage Figure" button in the figpack GUI status bar.

The interface is URL-driven, accessed via:

```
https://manage.figpack.org/figure?figure_url=<encoded_figure_url>
```

## Core Features

### Figure Status Management

- Displays comprehensive figure metadata including:
  - Upload status and progress
  - Creation and expiration timestamps
  - File counts and total size
  - Figure URL and owner information
- Real-time status updates with expiration countdown
- File manifest viewing capabilities

### Key Actions

- Figure pinning to prevent expiration
- Expiration management (renewal)
- Figure deletion
- Data refresh
- Quick access to figure viewing

## Development Setup

### Prerequisites

- Node.js and npm
- Git for version control

### Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The development server runs on localhost with hot reload enabled.

### Project Structure

```
figpack-manage/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── contexts/      # React contexts
│   └── config.ts      # Configuration
```

## Admin Capabilities

The management interface includes an administrative panel with the following capabilities:

### User Management

- View all registered users
- Add new users with specified permissions
- Edit existing user details and permissions
- Delete users

### Storage Management

- View and manage storage buckets
- Create new storage buckets
- Edit bucket configurations
- Delete storage buckets

## Deployment

The management interface is set up to be deployed to Vercel and the default instance can be accessed at https://manage.figpack.org. The VITE_FIGPACK_BASE_URL environment variable can be set to point to a custom figpack API instance if needed. By default, it points to https://figpack-api.figpack.org.

## Authentication & API Integration

### Authentication

- Uses API key-based authentication
- Keys are stored securely in local storage
- Permissions determine available actions (e.g., pinning, deletion)

### API Communication

- Communicates with the figpack API (default: https://figpack-api.figpack.org)
- API base URL configurable via environment variables
- Handles figure metadata, status updates, and user actions

### Data Sources

The interface reads two key files from figure directories:

- `figpack.json`: Contains status, metadata, and expiration info
- `manifest.json`: Contains file listings and size information
