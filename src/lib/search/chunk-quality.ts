/** Drop bibliography / URL-list chunks that pollute medical QA retrieval. */
export function isBibliographyChunk(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length < 80) return false;

  const urlCount = (trimmed.match(/https?:\/\//gi) ?? []).length;
  const numberedRefs = (trimmed.match(/^\d+\s+[A-Z][a-z]/gm) ?? []).length;
  const medscapeRefs = (trimmed.match(/medscape\.com/gi) ?? []).length;

  if (urlCount >= 3) return true;
  if (urlCount >= 2 && numberedRefs >= 2) return true;
  if (medscapeRefs >= 2 && numberedRefs >= 2) return true;

  return false;
}
