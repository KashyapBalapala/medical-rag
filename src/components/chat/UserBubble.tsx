"use client";

import { motion } from "framer-motion";

type UserBubbleProps = {
  content: string;
  createdAt?: string;
};

export default function UserBubble({ content, createdAt }: UserBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex max-w-[85%] items-end gap-2 sm:max-w-xl"
    >
      <div className="min-w-0 rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-white shadow-md shadow-blue-600/20">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        {createdAt && (
          <p className="mt-1.5 text-[10px] text-blue-200/80">
            {new Date(createdAt).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700"
        aria-hidden
      >
        You
      </div>
    </motion.div>
  );
}
