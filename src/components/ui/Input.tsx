import { cn, ds } from "@/lib/design-system";
import type { ReactNode, TextareaHTMLAttributes, InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(ds.input.base, "px-4 py-2.5 text-sm sm:text-base", className)}
      {...props}
    />
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(ds.input.base, ds.input.textarea, className)}
      {...props}
    />
  );
}

export function InputHint({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <p className={cn(ds.input.hint, className)}>{children}</p>;
}
