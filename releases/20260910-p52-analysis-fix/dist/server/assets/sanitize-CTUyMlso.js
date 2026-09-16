const MAX_INPUT_LENGTH = 1e4;
function sanitizeInput(input) {
  if (!input || typeof input !== "string") return "";
  let sanitized = input.trim().slice(0, MAX_INPUT_LENGTH);
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  sanitized = sanitized.replace(/\n{4,}/g, "\n\n\n");
  sanitized = sanitized.replace(/<[^>]*>/g, "");
  return sanitized;
}
function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}
export {
  sanitizeUrl as a,
  sanitizeInput as s
};
