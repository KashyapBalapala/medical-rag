import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RAG Evaluation Lab | Medical RAG Assistant",
  description: "Test retrieval quality, latency, and generation for medical RAG queries",
};

export default function EvaluationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
