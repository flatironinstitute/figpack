import { Env, FigpackDocument, RateLimitResult } from "../types";
import { json } from "../utils";
import { validateApiKey } from "../auth";

// Helper function to generate document ID
function generateDocumentId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper function to extract figure refs from markdown
function extractFigureRefsFromMarkdown(content: string): string[] {
  const figureRefs: string[] = [];
  const regex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const url = match[1];
    if (url.includes("/figures/")) {
      figureRefs.push(url);
    }
  }
  
  return [...new Set(figureRefs)]; // Remove duplicates
}

// Helper function to parse document from database
function parseDocument(row: any): FigpackDocument {
  return {
    id: row.id,
    documentId: row.document_id,
    ownerEmail: row.owner_email,
    title: row.title,
    content: row.content,
    figureRefs: JSON.parse(row.figure_refs || '[]'),
    viewMode: row.view_mode as 'owner-only' | 'users' | 'public',
    editMode: row.edit_mode as 'owner-only' | 'users',
    viewerEmails: JSON.parse(row.viewer_emails || '[]'),
    editorEmails: JSON.parse(row.editor_emails || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function handleCreateDocument(
  request: Request,
  env: Env,
  rateLimitResult: RateLimitResult
): Promise<Response> {
  try {
    const body = await request.json() as any;
    const { apiKey, title, content } = body;

    if (!apiKey) {
      return json({ success: false, message: "Missing required field: apiKey" }, 400);
    }

    if (!title || !title.trim()) {
      return json({ success: false, message: "Missing required field: title" }, 400);
    }

    // Validate title length
    if (title.trim().length > 200) {
      return json({ success: false, message: "Title must be 200 characters or less" }, 400);
    }

    const documentContent = content ?? "";

    // Validate content length (1MB limit)
    if (documentContent.length > 1000000) {
      return json({ success: false, message: "Content must be 1MB or less" }, 400);
    }

    // Authenticate with API key
    const authResult = await validateApiKey(apiKey, env);
    if (!authResult.isValid || !authResult.user) {
      return json({ success: false, message: "Invalid API key" }, 401);
    }

    const ownerEmail = authResult.user.email;

    // Generate unique document ID
    const documentId = generateDocumentId();

    // Extract figure references from content
    const figureRefs = extractFigureRefsFromMarkdown(documentContent);

    // Create new document with default access control (owner-only)
    const now = Date.now();
    const result = await env.figpack_db
      .prepare(`
        INSERT INTO figpack_documents (
          document_id, owner_email, title, content, figure_refs,
          view_mode, edit_mode, viewer_emails, editor_emails,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        documentId,
        ownerEmail,
        title.trim(),
        documentContent,
        JSON.stringify(figureRefs),
        "owner-only",
        "owner-only",
        "[]",
        "[]",
        now,
        now
      )
      .run();

    // Fetch the created document
    const newDocument = await env.figpack_db
      .prepare("SELECT * FROM figpack_documents WHERE id = ?")
      .bind(result.meta.last_row_id)
      .first();

    return json({
      success: true,
      message: "Document created successfully",
      document: parseDocument(newDocument),
    }, 201, {
      "X-RateLimit-Limit": "30",
      "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(rateLimitResult.resetTime / 1000).toString(),
    });
  } catch (error) {
    console.error("Create document API error:", error);
    return json({
      success: false,
      message: `Internal server error: ${error || "Unknown error"}`,
    }, 500);
  }
}

export async function handleGetDocument(
  request: Request,
  env: Env,
  rateLimitResult: RateLimitResult
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const documentId = url.searchParams.get("documentId");
    const apiKey = url.searchParams.get("apiKey");

    if (!documentId) {
      return json({ success: false, message: "Missing required field: documentId" }, 400);
    }

    // Find the document
    const docRow = await env.figpack_db
      .prepare("SELECT * FROM figpack_documents WHERE document_id = ?")
      .bind(documentId)
      .first();

    if (!docRow) {
      return json({ success: false, message: "Document not found" }, 404);
    }

    const document = parseDocument(docRow);

    // Check access permissions
    let userEmail: string | null = null;
    if (apiKey) {
      const authResult = await validateApiKey(apiKey, env);
      if (authResult.isValid && authResult.user) {
        userEmail = authResult.user.email;
      }
    }

    // Check view access
    const hasViewAccess =
      document.viewMode === "public" ||
      (userEmail && document.ownerEmail === userEmail) ||
      (userEmail && document.viewMode === "users" && document.viewerEmails.includes(userEmail));

    if (!hasViewAccess) {
      return json({ success: false, message: "Access denied" }, 403);
    }

    // Check edit access
    const hasEditAccess =
      (userEmail && document.ownerEmail === userEmail) ||
      (userEmail && document.editMode === "users" && document.editorEmails.includes(userEmail));

    return json({
      success: true,
      message: "Document found",
      document: {
        ...document,
        hasEditAccess,
      },
    }, 200);
  } catch (error) {
    console.error("Get document API error:", error);
    return json({ success: false, message: "Internal server error" }, 500);
  }
}

export async function handleListDocuments(
  request: Request,
  env: Env,
  rateLimitResult: RateLimitResult
): Promise<Response> {
  try {
    const apiKey = request.headers.get("x-api-key");

    if (!apiKey) {
      return json({ success: false, message: "API key is required" }, 400);
    }

    // Authenticate
    const authResult = await validateApiKey(apiKey, env);
    if (!authResult.isValid || !authResult.user) {
      return json({ success: false, message: "Invalid API key" }, 401);
    }

    const userEmail = authResult.user.email;

    // Get documents where user is owner or has view access
    const result = await env.figpack_db
      .prepare(`
        SELECT * FROM figpack_documents 
        WHERE owner_email = ? 
           OR view_mode = 'public'
           OR (view_mode = 'users' AND (
             viewer_emails LIKE ? OR viewer_emails LIKE ? OR viewer_emails LIKE ?
           ))
        ORDER BY updated_at DESC
      `)
      .bind(
        userEmail,
        `%"${userEmail}"%`,
        `%"${userEmail}",%`,
        `%,"${userEmail}"%`
      )
      .all();

    const documents = result.results.map(parseDocument);

    return json({
      success: true,
      documents,
    }, 200, {
      "X-RateLimit-Limit": "30",
      "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(rateLimitResult.resetTime / 1000).toString(),
    });
  } catch (error) {
    console.error("List documents API error:", error);
    return json({ success: false, message: "Internal server error" }, 500);
  }
}

export async function handleUpdateDocument(
  request: Request,
  env: Env,
  rateLimitResult: RateLimitResult
): Promise<Response> {
  try {
    const body = await request.json() as any;
    const { documentId, apiKey, title, content, accessControl } = body;

    if (!documentId) {
      return json({ success: false, message: "Missing required field: documentId" }, 400);
    }

    if (!apiKey) {
      return json({ success: false, message: "API key is required" }, 400);
    }

    // Authenticate
    const authResult = await validateApiKey(apiKey, env);
    if (!authResult.isValid || !authResult.user) {
      return json({ success: false, message: "Invalid API key" }, 401);
    }

    // Find the document
    const docRow = await env.figpack_db
      .prepare("SELECT * FROM figpack_documents WHERE document_id = ?")
      .bind(documentId)
      .first();

    if (!docRow) {
      return json({ success: false, message: "Document not found" }, 404);
    }

    const document = parseDocument(docRow);
    const userEmail = authResult.user.email;

    // Check edit access
    const hasEditAccess =
      document.ownerEmail === userEmail ||
      (document.editMode === "users" && document.editorEmails.includes(userEmail));

    if (!hasEditAccess) {
      return json({ success: false, message: "Access denied" }, 403);
    }

    // Build update
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      if (!title.trim()) {
        return json({ success: false, message: "Title cannot be empty" }, 400);
      }
      if (title.trim().length > 200) {
        return json({ success: false, message: "Title must be 200 characters or less" }, 400);
      }
      updates.push("title = ?");
      values.push(title.trim());
    }

    if (content !== undefined) {
      if (content.length > 1000000) {
        return json({ success: false, message: "Content must be 1MB or less" }, 400);
      }
      updates.push("content = ?");
      values.push(content);
      
      // Update figure refs
      const figureRefs = extractFigureRefsFromMarkdown(content);
      updates.push("figure_refs = ?");
      values.push(JSON.stringify(figureRefs));
    }

    // Only owner can update access control
    if (accessControl && document.ownerEmail === userEmail) {
      if (accessControl.viewMode) {
        updates.push("view_mode = ?");
        values.push(accessControl.viewMode);
      }
      if (accessControl.editMode) {
        updates.push("edit_mode = ?");
        values.push(accessControl.editMode);
      }
      if (accessControl.viewerEmails) {
        updates.push("viewer_emails = ?");
        values.push(JSON.stringify(accessControl.viewerEmails));
      }
      if (accessControl.editorEmails) {
        updates.push("editor_emails = ?");
        values.push(JSON.stringify(accessControl.editorEmails));
      }
    }

    if (updates.length === 0) {
      return json({ success: false, message: "No fields to update" }, 400);
    }

    // Add updated timestamp
    updates.push("updated_at = ?");
    values.push(Date.now());

    // Add document ID for WHERE clause
    values.push(documentId);

    // Execute update
    await env.figpack_db
      .prepare(`UPDATE figpack_documents SET ${updates.join(", ")} WHERE document_id = ?`)
      .bind(...values)
      .run();

    // Fetch updated document
    const updatedRow = await env.figpack_db
      .prepare("SELECT * FROM figpack_documents WHERE document_id = ?")
      .bind(documentId)
      .first();

    return json({
      success: true,
      message: "Document updated successfully",
      document: parseDocument(updatedRow),
    }, 200, {
      "X-RateLimit-Limit": "30",
      "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(rateLimitResult.resetTime / 1000).toString(),
    });
  } catch (error) {
    console.error("Update document API error:", error);
    return json({ success: false, message: "Internal server error" }, 500);
  }
}

export async function handleDeleteDocument(
  request: Request,
  env: Env,
  rateLimitResult: RateLimitResult
): Promise<Response> {
  try {
    const body = await request.json() as any;
    const { documentId, apiKey } = body;

    if (!documentId) {
      return json({ success: false, message: "Missing required field: documentId" }, 400);
    }

    if (!apiKey) {
      return json({ success: false, message: "API key is required" }, 400);
    }

    // Authenticate
    const authResult = await validateApiKey(apiKey, env);
    if (!authResult.isValid || !authResult.user) {
      return json({ success: false, message: "Invalid API key" }, 401);
    }

    // Find the document
    const docRow = await env.figpack_db
      .prepare("SELECT * FROM figpack_documents WHERE document_id = ?")
      .bind(documentId)
      .first();

    if (!docRow) {
      return json({ success: false, message: "Document not found" }, 404);
    }

    const document = parseDocument(docRow);

    // Only owner can delete
    if (document.ownerEmail !== authResult.user.email) {
      return json({ success: false, message: "Access denied. Only owner can delete." }, 403);
    }

    // Delete the document
    await env.figpack_db
      .prepare("DELETE FROM figpack_documents WHERE document_id = ?")
      .bind(documentId)
      .run();

    return json({
      success: true,
      message: "Document deleted successfully",
    }, 200, {
      "X-RateLimit-Limit": "30",
      "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(rateLimitResult.resetTime / 1000).toString(),
    });
  } catch (error) {
    console.error("Delete document API error:", error);
    return json({ success: false, message: "Internal server error" }, 500);
  }
}

export async function handleGetDocumentsReferencingFigure(
  request: Request,
  env: Env,
  rateLimitResult: RateLimitResult
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const figureUrl = url.searchParams.get("figureUrl");
    const apiKey = url.searchParams.get("apiKey");

    if (!figureUrl) {
      return json({ success: false, message: "Missing required field: figureUrl" }, 400);
    }

    let userEmail: string | null = null;
    if (apiKey) {
      const authResult = await validateApiKey(apiKey, env);
      if (authResult.isValid && authResult.user) {
        userEmail = authResult.user.email;
      }
    }

    // Find documents that reference this figure using JSON functions
    const result = await env.figpack_db
      .prepare(`
        SELECT * FROM figpack_documents 
        WHERE EXISTS (
          SELECT 1 FROM json_each(figure_refs) 
          WHERE value = ?
        )
        ORDER BY updated_at DESC
      `)
      .bind(figureUrl)
      .all();

    const documents = result.results
      .map(parseDocument)
      .filter(doc => {
        // Filter by access permissions
        return (
          doc.viewMode === "public" ||
          (userEmail && doc.ownerEmail === userEmail) ||
          (userEmail && doc.viewMode === "users" && doc.viewerEmails.includes(userEmail))
        );
      });

    return json({
      success: true,
      documents,
    }, 200, {
      "X-RateLimit-Limit": "30",
      "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(rateLimitResult.resetTime / 1000).toString(),
    });
  } catch (error) {
    console.error("Get documents referencing figure API error:", error);
    return json({ success: false, message: "Internal server error" }, 500);
  }
}
