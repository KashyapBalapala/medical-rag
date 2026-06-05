export function buildPdfApiUrl(metadataFilename: string): string {
  return `/api/pdf?file=${encodeURIComponent(metadataFilename)}`;
}
