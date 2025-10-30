/**
 * Utility functions for document management
 */

/**
 * Extract figure URLs from markdown content
 * Looks for iframe src attributes containing figpack figure URLs
 */
export function extractFigureRefsFromMarkdown(content: string): string[] {
  // Regex to find iframe src attributes containing figpack URLs
  const iframeRegex = /<iframe[^>]+src=["']([^"']*figures\.figpack\.org[^"']*)["']/gi;
  const refs: string[] = [];
  let match;

  while ((match = iframeRegex.exec(content)) !== null) {
    refs.push(match[1]);
  }

  // Remove duplicates
  return Array.from(new Set(refs));
}

/**
 * Generate a unique document ID
 */
export function generateDocumentId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "doc_";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
