/** Source evidence returned by /api/chat and used in the evidence viewer. */
export type SourceEvidence = {
  file: string;
  score: number;
  chunkIndex: number;
  excerpt: string;
  pageNumber?: number | null;
};

export type SourceType = "library" | "upload";

export type SourceOpenPayload = {
  source: SourceEvidence;
  sources: SourceEvidence[];
  query?: string;
  retrievedAt?: string;
};

/** @deprecated Use SourceOpenPayload */
export type PdfViewerOpenPayload = SourceOpenPayload;

/** Shared navigation state for evidence drawer and PDF viewer */
export type SourceCollectionState = {
  sources: SourceEvidence[];
  activeIndex: number;
  query?: string;
  retrievedAt?: string;
};

export type SourceCardProps = {
  source: SourceEvidence;
  index?: number;
  onClick: (source: SourceEvidence) => void;
};

export type EvidenceDrawerState = SourceCollectionState;

export type PdfViewerState = Pick<
  SourceCollectionState,
  "sources" | "activeIndex" | "query"
>;

export type EvidenceDrawerProps = {
  state: EvidenceDrawerState | null;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  onViewPdf?: (source: SourceEvidence) => void;
};

export type PdfViewerModalProps = {
  state: PdfViewerState | null;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
};
