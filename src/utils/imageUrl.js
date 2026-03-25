const API_URL = process.env.REACT_APP_API_URL;

/**
 * Converts a stored profile_image value to a displayable URL.
 * - Relative paths like /uploads/... → prefixed with API_URL
 * - Absolute URLs (legacy http/https) → returned as-is
 * - null/empty → returns null
 */
export const getProfileImageUrl = (profileImage) => {
  if (!profileImage) return null;
  if (profileImage.startsWith('http')) return profileImage;
  return `${API_URL}${profileImage}`;
};

/** Same logic for document URLs (/uploads/doc-*.pdf etc.) */
export const getDocumentUrl = (docPath) => {
  if (!docPath) return null;
  if (docPath.startsWith('http')) return docPath;
  return `${API_URL}${docPath}`;
};
