/**
 * Medical RAG design system — Tailwind class tokens.
 *
 * Palette:
 *   Primary   → blue   (trust, clinical authority)
 *   Secondary → cyan   (knowledge, clarity)
 *   Neutral   → slate  (research platform chrome)
 */

export const ds = {
  /** Page & layout shells */
  layout: {
    page: "flex min-h-full flex-col bg-gradient-to-b from-slate-50 via-blue-50/20 to-slate-100",
    container: "mx-auto w-full max-w-[1000px]",
    containerWide: "mx-auto w-full max-w-6xl",
    section: "px-4 sm:px-6",
  },

  /** Semantic color shortcuts */
  colors: {
    primary: {
      DEFAULT: "bg-blue-600 text-white",
      hover: "hover:bg-blue-700",
      light: "bg-blue-50 text-blue-700",
      ring: "focus:ring-blue-500/20",
      border: "border-blue-500",
      text: "text-blue-600",
      shadow: "shadow-blue-600/20",
    },
    secondary: {
      DEFAULT: "bg-cyan-500 text-white",
      hover: "hover:bg-cyan-600",
      light: "bg-cyan-50 text-cyan-700",
      ring: "focus:ring-cyan-500/20",
      border: "border-cyan-500",
      text: "text-cyan-600",
    },
    neutral: {
      bg: "bg-white",
      bgMuted: "bg-slate-50",
      border: "border-slate-200/80",
      text: "text-slate-900",
      textMuted: "text-slate-500",
      textSubtle: "text-slate-400",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
    },
  },

  /** Typography scale */
  typography: {
    h1: "text-lg font-semibold tracking-tight text-slate-900 sm:text-xl",
    h2: "text-sm font-semibold uppercase tracking-wide text-slate-500",
    body: "text-sm leading-relaxed text-slate-800 sm:text-base",
    caption: "text-xs text-slate-400 sm:text-sm",
    label: "text-xs font-medium uppercase tracking-wide text-slate-400",
  },

  /** Interactive elements */
  button: {
    base: "inline-flex items-center justify-center gap-2 rounded-xl font-medium shadow-sm transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:shadow-none",
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500/20 disabled:bg-slate-300",
    secondary:
      "bg-cyan-500 text-white hover:bg-cyan-600 focus:ring-cyan-500/20 disabled:bg-slate-300",
    ghost:
      "bg-transparent text-slate-600 shadow-none hover:bg-slate-100 focus:ring-slate-500/10 disabled:text-slate-300",
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-2.5 text-sm",
    lg: "px-6 py-3 text-sm sm:text-base",
  },

  /** Surface cards */
  card: {
    base: "rounded-xl border border-slate-200/80 bg-white shadow-sm transition",
    hover: "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
    elevated: "rounded-2xl shadow-md",
    padding: "p-4 sm:p-5",
    paddingSm: "p-3.5",
  },

  /** Form controls */
  input: {
    base: "w-full rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60",
    textarea: "resize-none px-4 py-3 text-sm leading-relaxed sm:text-base",
    hint: "text-xs text-slate-400 sm:text-sm",
  },

  /** Chat-specific bubbles */
  chat: {
    userBubble:
      "rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-white shadow-sm shadow-blue-600/10",
    assistantBubble:
      "rounded-2xl rounded-bl-md border border-slate-200/80 bg-white px-4 py-3 shadow-sm",
    errorBubble:
      "rounded-2xl rounded-bl-md border border-red-200 bg-red-50 px-4 py-3 shadow-sm",
  },

  /** Header chrome */
  header: {
    shell:
      "shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm",
    inner: "flex items-center gap-3 py-4",
  },

  /** Logo placeholder */
  logo: {
    shell:
      "flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-md shadow-blue-600/25",
    sm: "h-9 w-9",
    md: "h-10 w-10",
    lg: "h-14 w-14 rounded-2xl",
    iconSm: "h-4 w-4",
    iconMd: "h-5 w-5",
    iconLg: "h-7 w-7",
  },
} as const;

export function cn(
  ...classes: (string | false | null | undefined)[]
): string {
  return classes.filter(Boolean).join(" ");
}
