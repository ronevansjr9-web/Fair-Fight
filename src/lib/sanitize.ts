/**
 * Input sanitization utilities.
 * Strips potentially harmful content from user-provided strings
 * before they are stored, displayed, or sent to AI models.
 */

const MAX_INPUT_LENGTH = 10000;

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return "";

  // Trim and limit length
  let sanitized = input.trim().slice(0, MAX_INPUT_LENGTH);

  // Remove null bytes and control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Collapse multiple consecutive newlines
  sanitized = sanitized.replace(/\n{4,}/g, "\n\n\n");

  // Remove HTML tags (except in code blocks)
  sanitized = sanitized.replace(/<[^>]*>/g, "");

  return sanitized;
}

export function sanitizeFileName(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, 255);
}

export function sanitizeHtml(html: string): string {
  // Escape HTML entities
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow http and https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}
