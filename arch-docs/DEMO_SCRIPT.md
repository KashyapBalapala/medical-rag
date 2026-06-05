# Demo Script (3 minutes)

A timed walkthrough of the Medical RAG Assistant using only features implemented in the codebase.

**Audience:** Developers or stakeholders evaluating the local RAG pipeline.

**Duration:** ~3 minutes (180 seconds).

---

## Before you start

Start these processes before the demo:

```bash
# Terminal 1
npm run chroma:server

# Terminal 2 (if not already indexed)
npm run ingest

# Terminal 3
npm run dev
```

Confirm:

- Ollama is running with the model in `.env.local` (default `qwen2.5:7b`): `curl http://localhost:11434/api/tags`
- App loads at [http://localhost:3000](http://localhost:3000)
- **RAG Analytics Dashboard** shows document and chunk counts (fetched from `GET /api/stats`)

> **Note:** Answer generation with `qwen2.5:7b` can take several minutes on CPU. For a live demo, set `OLLAMA_MODEL=llama3.2:3b` in `.env.local` and restart `npm run dev`, or pre-run a question before the audience arrives.

---

## Script

### 0:00 – 0:20 | Introduce the system

**Say:**

> "This is a local medical document assistant. PDFs are chunked and embedded into ChromaDB. Questions retrieve relevant excerpts, and Ollama generates grounded answers with source citations — no cloud API keys."

**Show:**

1. Home page at `http://localhost:3000`
2. Header: **Medical RAG Assistant**
3. Expand **RAG Analytics Dashboard** — point out:
   - Documents Indexed / Total Chunks (from `/api/stats`)
   - Embedding Model: `Xenova/all-MiniLM-L6-v2`
   - LLM Model: value of `OLLAMA_MODEL`

**Do not enable** Research mode or RAG Debug yet.

---

### 0:20 – 0:50 | Upload a PDF

**Say:**

> "Documents enter the index two ways: batch ingest of `docs/*.pdf`, or upload through the UI. Uploads are saved to `docs/uploads/` and ingested immediately via `POST /api/upload`."

**Do:**

1. Open the **Documents** sidebar (visible on large screens; on mobile tap **Documents** in the header)
2. In the **Upload PDF** panel, drag a PDF onto the drop zone **or** click **Choose file**
3. Wait for the upload phase → ingesting phase → done

**Show:**

- Upload card text: `Saved to docs/uploads · indexed automatically`
- Success message with `chunkCount` from the API response
- Document list refreshes via `GET /api/documents` — new file appears with `source: "upload"`

**Say:**

> "The same pipeline runs here as `npm run ingest`: pdf-parse extracts text, LangChain splits into 1000-character chunks with 200 overlap, Xenova generates embeddings, and ChromaDB stores them in the `medical_docs` collection."

Click **Refresh** on the analytics dashboard if chunk counts did not update.

---

### 0:50 – 1:40 | Ask a question

**Say:**

> "I'll ask a question against the indexed library. The app sends the question and any conversation history to `POST /api/chat`, which runs retrieval then Ollama."

**Do:**

1. Click a suggested question from **Suggested questions** in the empty state, **or** type:

   ```
   How is diabetes diagnosed?
   ```

   (This exact string is in `QuerySuggestions.tsx`.)

2. Press **Send** or Enter

**While waiting** (AILoading spinner):

> "Retrieval embeds the question with the same Xenova model, searches ChromaDB for the top 3 chunks, builds a context block, and sends it to Ollama at temperature 0."

**When the answer appears, show:**

- Markdown-rendered answer (`MarkdownContent.tsx`)
- **Confidence** indicator (`ConfidenceIndicator.tsx`) — average retrieval similarity as a percentage
- **Source citations** (`CitationPills` / `SourceCard`) — file name, chunk index, similarity score
- Timing pills on the answer card if debug timings are available

**Say:**

> "Confidence is the average similarity score of retrieved chunks. Each source links back to the exact chunk stored in Chroma."

---

### 1:40 – 2:10 | Show evidence

**Say:**

> "Every source is inspectable. The evidence drawer loads the full chunk from Chroma and can open the original PDF."

**Do:**

1. Click a **source citation** on the answer
2. **Evidence drawer** opens (`EvidenceDrawer.tsx`)

**Show:**

- Full chunk text (loaded via `GET /api/sources/chunk?file=&chunkIndex=`)
- Similarity score and source type (library vs upload)
- Query term highlighting (`highlight-text.tsx`)
- Expand / copy controls

**Optional (15 s):**

3. Click **View PDF** in the drawer
4. **PDF viewer modal** opens (`PDFViewerModal.tsx`) — renders via `GET /api/pdf?file=` and `react-pdf`
5. If `pageNumber` was estimated (`chunk-lookup.ts` + `pdf-page.ts`), the viewer jumps to that page

**Say:**

> "Page numbers are estimated by matching chunk text against PDF pages — not exact byte offsets."

Close the drawer.

---

### 2:10 – 2:40 | Show conversational memory

**Say:**

> "Follow-up questions use client-side memory. Up to 10 exchange pairs are stored in localStorage and sent as `history` on each request. Retrieval expands pronoun-style follow-ups using the last user turn."

**Do:**

1. Type a follow-up:

   ```
   What are its symptoms?
   ```

2. Press Send

**Show:**

- **Memory indicator** in the composer (`MemoryIndicator.tsx`) — shows active memory and exchange count
- Answer grounded in diabetes-related chunks (retrieval query expanded by `buildRetrievalQuery()`)

**Say:**

> "Memory is browser-local — key `medical-rag-conversation`. The server receives history per request but does not persist it. Clearing chat wipes localStorage."

**Optional:** Click **Clear chat** to demonstrate reset.

---

### 2:40 – 3:00 | Show analytics

**Say:**

> "The analytics dashboard tracks this browser session — not global server metrics."

**Do:**

1. Expand **RAG Analytics Dashboard**
2. Scroll to **Session performance** and **Charts**

**Show:**

| UI element | Source |
|---|---|
| Avg Retrieval / Generation / Response Time | `computeSessionAnalytics()` from message timings |
| Queries Processed | User message count this session |
| Ungrounded Answers | Answers with zero sources |
| Avg Similarity Score | Mean confidence % |
| Average latency breakdown | `StackedLatencyChart` |
| Confidence distribution | `BarChart` with High / Medium / Low buckets |
| Response time per query | `BarChart` per question order |
| Similarity trend | `SparklineChart` |

**Say:**

> "Enable **RAG Debug** in the header to receive server-side `retrievalMs` and `generationMs` instead of client estimates. The Evaluation Lab at `/evaluation` runs the same pipeline with debug always on and stores run history."

**Optional last 10 s:** Open [http://localhost:3000/evaluation](http://localhost:3000/evaluation) and mention pipeline visualization (`EvalPipelineViz.tsx`).

---

## Demo checklist

| Step | Feature | Key file(s) |
|---|---|---|
| ☐ | Analytics / stats | `RagAnalyticsDashboard.tsx`, `/api/stats` |
| ☐ | PDF upload + ingest | `DocumentUpload.tsx`, `/api/upload`, `ingest.ts` |
| ☐ | Ask question | `page.tsx`, `/api/chat`, `rag.ts` |
| ☐ | Source citations | `AnswerCard.tsx`, `SourceCard.tsx` |
| ☐ | Evidence drawer | `EvidenceDrawer.tsx`, `/api/sources/chunk` |
| ☐ | PDF viewer | `PDFViewerModal.tsx`, `/api/pdf` |
| ☐ | Memory follow-up | `memory-service.ts`, `conversation.ts`, `MemoryIndicator.tsx` |
| ☐ | Session analytics | `session-analytics.ts`, `RagAnalyticsDashboard.tsx` |

---

## Fallback questions

If the primary question returns no sources, try these from `QuerySuggestions.tsx`:

| Mode | Question |
|---|---|
| Standard | `What are symptoms of diabetes?` |
| Standard | `What is hypertension?` |
| Research (toggle on) | `Compare diabetes and hypertension.` |

Research mode is toggled in the header (`medical-rag-research-mode` in `localStorage`) or auto-detected from comparison phrasing via `isResearchQuestion()`.

---

## Troubleshooting during demo

| Symptom | Quick fix |
|---|---|
| "Cannot reach Chroma" | `npm run chroma:server` |
| Empty answers / 0 sources | `npm run ingest`; confirm PDFs in `docs/` |
| LLM error | Check Ollama: `curl http://localhost:11434/api/tags` |
| Slow response | Use `llama3.2:3b` or pre-warm with one question before demo |
| Upload fails | PDF only, max 25 MB (`upload.ts`) |

---

## Related documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [RAG_FLOW.md](./RAG_FLOW.md)
- [../README.md](../README.md)
